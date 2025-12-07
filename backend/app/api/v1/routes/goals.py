import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import get_current_user
from app.core.db import AsyncSession, get_db
from app.schemas.breakdown import BreakdownRequest, BreakdownResponse
from app.schemas.common import StandardResponse, ok
from app.schemas.goal import GoalCreate, GoalResponse, GoalUpdate
from app.schemas.user import UserResponse
from app.services.ai_service import DifyAIService
from app.services.goal_service import GoalService

router = APIRouter(prefix="/goals", tags=["goals"])
goal_service = GoalService()
ai_service = DifyAIService()


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
