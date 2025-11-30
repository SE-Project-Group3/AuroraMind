import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.deps import get_current_user
from app.core.db import AsyncSession, get_db
from app.schemas.common import StandardResponse, ok
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.schemas.user import UserResponse
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])
task_service = TaskService()


@router.get("", response_model=StandardResponse[list[TaskResponse]])
async def list_tasks(
    task_list_id: uuid.UUID | None = Query(default=None),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[list[TaskResponse] | None]:
    tasks = await task_service.list_tasks(db, current_user.id, task_list_id)
    if not tasks:
        return ok([])
    return ok([TaskResponse.model_validate(task) for task in tasks])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=StandardResponse[TaskResponse],
)
async def create_task(
    task_data: TaskCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[TaskResponse | None]:
    try:
        task = await task_service.create_task(db, current_user.id, task_data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return ok(TaskResponse.model_validate(task))


@router.get(
    "/{task_id}",
    response_model=StandardResponse[TaskResponse],
)
async def get_task(
    task_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[TaskResponse | None]:
    task = await task_service.get_task(db, task_id, current_user.id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return ok(TaskResponse.model_validate(task))


@router.put(
    "/{task_id}",
    response_model=StandardResponse[TaskResponse],
)
async def update_task(
    task_id: uuid.UUID,
    task_data: TaskUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[TaskResponse | None]:
    try:
        task = await task_service.update_task(db, task_id, current_user.id, task_data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return ok(TaskResponse.model_validate(task))


@router.delete(
    "/{task_id}",
    response_model=StandardResponse[bool],
)
async def delete_task(
    task_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[bool | None]:
    deleted = await task_service.delete_task(db, task_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return ok(True)

