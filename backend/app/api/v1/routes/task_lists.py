import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.deps import get_current_user
from app.core.db import AsyncSession, get_db
from app.schemas.common import StandardResponse, ok
from app.schemas.task_list import (
    TaskListCreate,
    TaskListResponse,
    TaskListUpdate,
)
from app.schemas.user import UserResponse
from app.services.task_service import TaskListService

router = APIRouter(prefix="/task-lists", tags=["task_lists"])
task_list_service = TaskListService()


@router.get("", response_model=StandardResponse[list[TaskListResponse]])
async def list_task_lists(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    goal_id: uuid.UUID | None = Query(default=None),
) -> StandardResponse[list[TaskListResponse] | None]:
    task_lists = await task_list_service.list_task_lists(db, current_user.id, goal_id)
    if not task_lists:
        return ok([])
    return ok([TaskListResponse.model_validate(task_list) for task_list in task_lists])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=StandardResponse[TaskListResponse],
)
async def create_task_list(
    task_list_data: TaskListCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[TaskListResponse | None]:
    try:
        task_list = await task_list_service.create_task_list(
            db, current_user.id, task_list_data
        )
        if not task_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task list already exists",
            )
        return ok(TaskListResponse.model_validate(task_list))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/{task_list_id}",
    response_model=StandardResponse[TaskListResponse],
)
async def get_task_list(
    task_list_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[TaskListResponse | None]:
    task_list = await task_list_service.get_task_list(
        db, task_list_id, current_user.id
    )
    if not task_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task list not found")
    return ok(TaskListResponse.model_validate(task_list))


@router.put(
    "/{task_list_id}",
    response_model=StandardResponse[TaskListResponse],
)
async def update_task_list(
    task_list_id: uuid.UUID,
    task_list_data: TaskListUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[TaskListResponse | None]:
    try:
        task_list = await task_list_service.update_task_list(
            db, task_list_id, current_user.id, task_list_data
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    if not task_list:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task list not found")
    return ok(TaskListResponse.model_validate(task_list))


@router.delete(
    "/{task_list_id}",
    response_model=StandardResponse[bool],
)
async def delete_task_list(
    task_list_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[bool | None]:
    deleted = await task_list_service.delete_task_list(db, task_list_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task list not found")
    return ok(True)
