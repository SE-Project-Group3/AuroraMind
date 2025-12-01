import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import get_current_user
from app.core.db import AsyncSession, get_db
from app.schemas.common import StandardResponse, ok
from app.schemas.phase import PhaseCreate, PhaseResponse, PhaseUpdate
from app.schemas.phase_task import PhaseTaskCreate, PhaseTaskResponse, PhaseTaskUpdate
from app.schemas.user import UserResponse
from app.services.phase_service import PhaseService

router = APIRouter(prefix="/phases", tags=["phases"])
phase_service = PhaseService()


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=StandardResponse[PhaseResponse],
)
async def create_phase(
    phase_data: PhaseCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[PhaseResponse | None]:
    phase = await phase_service.create_phase(db, current_user.id, phase_data)
    if not phase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )
    return ok(PhaseResponse.model_validate(phase))


@router.get(
    "",
    response_model=StandardResponse[list[PhaseResponse]],
)
async def list_phases(
    goal_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[list[PhaseResponse]]:
    goal = await phase_service.goal_service.get_goal(db, goal_id, current_user.id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")

    phases = await phase_service.list_phases(db, goal_id, current_user.id)
    return ok([PhaseResponse.model_validate(phase) for phase in phases])


@router.get(
    "/{phase_id}",
    response_model=StandardResponse[PhaseResponse],
)
async def get_phase(
    phase_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[PhaseResponse | None]:
    phase = await phase_service.get_phase(db, phase_id, current_user.id)
    if not phase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
    return ok(PhaseResponse.model_validate(phase))


@router.put(
    "/{phase_id}",
    response_model=StandardResponse[PhaseResponse],
)
async def update_phase(
    phase_id: uuid.UUID,
    phase_data: PhaseUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[PhaseResponse | None]:
    phase = await phase_service.update_phase(db, current_user.id, phase_id, phase_data)
    if not phase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
    return ok(PhaseResponse.model_validate(phase))


@router.delete(
    "/{phase_id}",
    response_model=StandardResponse[bool],
)
async def delete_phase(
    phase_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[bool | None]:
    deleted = await phase_service.delete_phase(db, current_user.id, phase_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
    return ok(True)


# Phase tasks
@router.post(
    "/{phase_id}/tasks",
    status_code=status.HTTP_201_CREATED,
    response_model=StandardResponse[PhaseTaskResponse],
)
async def create_phase_task(
    phase_id: uuid.UUID,
    phase_task_data: PhaseTaskCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[PhaseTaskResponse | None]:
    if phase_task_data.phase_id != phase_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="phase_id mismatch")
    phase_task = await phase_service.create_phase_task(db, current_user.id, phase_task_data)
    if not phase_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
    return ok(PhaseTaskResponse.model_validate(phase_task))


@router.put(
    "/tasks/{phase_task_id}",
    response_model=StandardResponse[PhaseTaskResponse],
)
async def update_phase_task(
    phase_task_id: uuid.UUID,
    phase_task_data: PhaseTaskUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[PhaseTaskResponse | None]:
    phase_task = await phase_service.update_phase_task(
        db, current_user.id, phase_task_id, phase_task_data
    )
    if not phase_task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase task not found")
    return ok(PhaseTaskResponse.model_validate(phase_task))


@router.delete(
    "/tasks/{phase_task_id}",
    response_model=StandardResponse[bool],
)
async def delete_phase_task(
    phase_task_id: uuid.UUID,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[bool | None]:
    deleted = await phase_service.delete_phase_task(db, current_user.id, phase_task_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase task not found")
    return ok(True)
