import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import get_current_user
from app.core.db import AsyncSession, get_db
from app.schemas.breakdown import (
    BreakdownRequest,
    BreakdownResponse,
    BreakdownSelectionRequest,
    BreakdownSelectionResponse,
)
from app.schemas.common import StandardResponse, ok
from app.schemas.goal import GoalCreate, GoalResponse, GoalUpdate
from app.schemas.task import TaskCreate
from app.schemas.task_list import TaskListCreate
from app.schemas.user import UserResponse
from app.services.ai_service import DifyAIService
from app.services.goal_service import GoalService
from app.services.task_service import TaskListService, TaskService

router = APIRouter(prefix="/goals", tags=["goals"])
goal_service = GoalService()
ai_service = DifyAIService()
task_service = TaskService()
task_list_service = TaskListService()


async def _generate_task_list_name(
    db: AsyncSession, user_id: uuid.UUID, goal_name: str | None
) -> str:
    base = (goal_name or "Breakdown").strip() or "Breakdown"
    base = f"{base} - breakdown"
    candidate = base
    suffix = 1
    while await task_list_service.get_task_list_by_name(db, candidate, user_id):
        candidate = f"{base} ({suffix})"
        suffix += 1
    return candidate


@router.get("", response_model=StandardResponse[list[GoalResponse]])
async def list_goals(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[list[GoalResponse] | None]:
    goals = await goal_service.list_goals(db, current_user.id)
    if not goals:
        return ok([])
    return ok([GoalResponse.model_validate(goal) for goal in goals])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=StandardResponse[GoalResponse],
)
async def create_goal(
    goal_data: GoalCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[GoalResponse | None]:
    goal = await goal_service.create_goal(db, current_user.id, goal_data)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Goal already exists",
        )
    return ok(GoalResponse.model_validate(goal))


@router.get(
    "/{goal_id}",
    response_model=StandardResponse[GoalResponse],
)
async def get_goal(
    goal_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[GoalResponse | None]:
    goal = await goal_service.get_goal(db, goal_id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return ok(GoalResponse.model_validate(goal))


@router.put(
    "/{goal_id}",
    response_model=StandardResponse[GoalResponse],
)
async def update_goal(
    goal_id: uuid.UUID,
    goal_data: GoalUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[GoalResponse | None]:
    try:
        goal = await goal_service.update_goal(db, goal_id, current_user.id, goal_data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return ok(GoalResponse.model_validate(goal))


@router.delete(
    "/{goal_id}",
    response_model=StandardResponse[bool],
)
async def delete_goal(
    goal_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[bool | None]:
    deleted = await goal_service.delete_goal(db, goal_id, current_user.id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return ok(True)


@router.post(
    "/{goal_id}/breakdown",
    response_model=StandardResponse[BreakdownResponse],
    summary="Break down goal text via AI",
)
async def breakdown_goal_text(
    goal_id: uuid.UUID,
    payload: BreakdownRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[BreakdownResponse]:
    goal = await goal_service.get_goal(db, goal_id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )

    try:
        items = await ai_service.breakdown_text(
            text=payload.text,
            model=payload.model,
            user_id=str(current_user.id),
            extra=payload.extra,
        )
    except RuntimeError as exc:
        # Missing configuration
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI provider error: {exc.response.status_code}",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to contact AI provider",
        ) from exc

    return ok(BreakdownResponse(goal_id=goal_id, items=items))


@router.post(
    "/{goal_id}/breakdown/selection",
    response_model=StandardResponse[BreakdownSelectionResponse],
    summary="Persist selected breakdown items into a task list",
)
async def persist_breakdown_selection(
    goal_id: uuid.UUID,
    payload: BreakdownSelectionRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[BreakdownSelectionResponse]:
    goal = await goal_service.get_goal(db, goal_id, current_user.id)
    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )

    # Use existing task list or create a new one under the goal
    task_list = None
    if payload.task_list_id:
        task_list = await task_list_service.get_task_list(
            db, payload.task_list_id, current_user.id
        )
        if not task_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Task list not found"
            )
        if task_list.goal_id != goal_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task list does not belong to this goal",
            )
    else:
        name = payload.task_list_name
        if not name:
            name = await _generate_task_list_name(db, current_user.id, goal.name)
        new_task_list = await task_list_service.create_task_list(
            db,
            current_user.id,
            TaskListCreate(name=name, goal_id=goal_id),
        )
        if not new_task_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task list already exists",
            )
        task_list = new_task_list

    # Create tasks from selected items
    created_task_ids: list[uuid.UUID] = []
    for item in payload.items:
        task = await task_service.create_task(
            db,
            current_user.id,
            task_data=TaskCreate(
                name=item.text,
                is_completed=False,
                task_list_id=task_list.id,
            ),
        )
        created_task_ids.append(task.id)

    return ok(
        BreakdownSelectionResponse(
            goal_id=goal_id,
            task_list=task_list.id,
            tasks=created_task_ids,
        )
    )
