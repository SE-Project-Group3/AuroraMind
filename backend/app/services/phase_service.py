from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.models.phase import Phase
from app.models.phase_task import PhaseTask
from app.schemas.phase import PhaseCreate, PhaseUpdate
from app.schemas.phase_task import PhaseTaskCreate, PhaseTaskUpdate
from app.services.goal_service import GoalService


class PhaseService:
    def __init__(self) -> None:
        self.goal_service = GoalService()

    async def _generate_default_name(
        self, db: AsyncSession, goal_id: uuid.UUID, user_id: uuid.UUID
    ) -> str:
        stmt: Select[tuple[Phase]] = select(Phase.name).where(
            and_(Phase.goal_id == goal_id, Phase.is_deleted.is_(False))
        )
        result = await db.execute(stmt)
        names = [row[0] for row in result.fetchall()]
        suffix = 0
        for name in names:
            if name.startswith("phase"):
                num_part = name.removeprefix("phase")
                if num_part.isdigit():
                    suffix = max(suffix, int(num_part))
        candidate = f"phase{suffix + 1}"
        while candidate in names:
            suffix += 1
            candidate = f"phase{suffix + 1}"
        return candidate

    async def create_phase(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        phase_data: PhaseCreate,
    ) -> Phase | None:
        goal = await self.goal_service.get_goal(db, phase_data.goal_id, user_id)
        if not goal:
            return None

        name = phase_data.name
        if not name:
            name = await self._generate_default_name(db, phase_data.goal_id, user_id)

        phase = Phase(
            goal_id=phase_data.goal_id,
            name=name,
            description=phase_data.description,
        )
        db.add(phase)
        await db.commit()
        await db.refresh(phase)
        return phase

    async def update_phase(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        phase_id: uuid.UUID,
        phase_data: PhaseUpdate,
    ) -> Phase | None:
        phase = await self.get_phase(db, phase_id, user_id)
        if not phase:
            return None

        if phase_data.name is not None:
            phase.name = phase_data.name
        if "description" in phase_data.model_fields_set:
            phase.description = phase_data.description

        await db.commit()
        await db.refresh(phase)
        return phase

    async def delete_phase(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        phase_id: uuid.UUID,
    ) -> bool:
        phase = await self.get_phase(db, phase_id, user_id)
        if not phase:
            return False
        phase.soft_delete()
        await db.commit()
        return True

    async def list_phases(
        self, db: AsyncSession, goal_id: uuid.UUID, user_id: uuid.UUID
    ) -> Sequence[Phase]:
        goal = await self.goal_service.get_goal(db, goal_id, user_id)
        if not goal:
            return []
        stmt: Select[tuple[Phase]] = select(Phase).where(
            and_(Phase.goal_id == goal_id, Phase.is_deleted.is_(False))
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_phase(
        self, db: AsyncSession, phase_id: uuid.UUID, user_id: uuid.UUID
    ) -> Phase | None:
        phase, _ = await self._get_phase_and_goal(db, phase_id, user_id)
        return phase

    # Phase task operations
    async def create_phase_task(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        phase_task_data: PhaseTaskCreate,
    ) -> PhaseTask | None:
        phase, _ = await self._get_phase_and_goal(db, phase_task_data.phase_id, user_id)
        if not phase:
            return None

        phase_task = PhaseTask(
            phase_id=phase_task_data.phase_id,
            name=phase_task_data.name,
            is_completed=phase_task_data.is_completed,
        )
        db.add(phase_task)
        await db.commit()
        await db.refresh(phase_task)
        return phase_task

    async def update_phase_task(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        phase_task_id: uuid.UUID,
        phase_task_data: PhaseTaskUpdate,
    ) -> PhaseTask | None:
        phase_task = await self.get_phase_task(db, phase_task_id, user_id)
        if not phase_task:
            return None

        if phase_task_data.name is not None:
            phase_task.name = phase_task_data.name
        if phase_task_data.is_completed is not None:
            phase_task.is_completed = phase_task_data.is_completed

        await db.commit()
        await db.refresh(phase_task)
        return phase_task

    async def delete_phase_task(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        phase_task_id: uuid.UUID,
    ) -> bool:
        phase_task = await self.get_phase_task(db, phase_task_id, user_id)
        if not phase_task:
            return False
        phase_task.soft_delete()
        await db.commit()
        return True

    async def get_phase_task(
        self, db: AsyncSession, phase_task_id: uuid.UUID, user_id: uuid.UUID
    ) -> PhaseTask | None:
        stmt: Select[tuple[PhaseTask, Phase]] = (
            select(PhaseTask, Phase)
            .join(Phase, PhaseTask.phase_id == Phase.id)
            .where(
                and_(
                    PhaseTask.id == phase_task_id,
                    PhaseTask.is_deleted.is_(False),
                    Phase.is_deleted.is_(False),
                )
            )
        )
        result = await db.execute(stmt)
        row = result.first()
        if not row:
            return None
        phase_task, phase = row
        goal = await self.goal_service.get_goal(db, phase.goal_id, user_id)
        if not goal:
            return None
        return phase_task

    async def _get_phase_and_goal(
        self, db: AsyncSession, phase_id: uuid.UUID, user_id: uuid.UUID
    ) -> tuple[Phase | None, uuid.UUID | None]:
        stmt: Select[tuple[Phase]] = select(Phase).where(
            and_(Phase.id == phase_id, Phase.is_deleted.is_(False))
        )
        result = await db.execute(stmt)
        phase = result.scalar_one_or_none()
        if not phase:
            return None, None
        goal = await self.goal_service.get_goal(db, phase.goal_id, user_id)
        if not goal:
            return None, None
        return phase, phase.goal_id
