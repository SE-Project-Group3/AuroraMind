from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.models.goal import Goal
from app.schemas.goal import GoalCreate, GoalUpdate


class GoalService:
    async def get_goal(self, db: AsyncSession, goal_id: uuid.UUID, user_id: uuid.UUID) -> Goal | None:
        stmt: Select[tuple[Goal]] = select(Goal).where(
            and_(Goal.id == goal_id, Goal.user_id == user_id, Goal.is_deleted.is_(False))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def _generate_default_name(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> str:
        stmt: Select[tuple[Goal]] = select(Goal.name).where(
            and_(Goal.user_id == user_id, Goal.is_deleted.is_(False))
        )
        result = await db.execute(stmt)
        names = [row[0] for row in result.fetchall()]
        suffix = 0
        for name in names:
            if name.startswith("newgoal"):
                num_part = name.removeprefix("newgoal")
                if num_part.isdigit():
                    suffix = max(suffix, int(num_part))
        candidate = f"newgoal{suffix + 1}"
        while candidate in names:
            suffix += 1
            candidate = f"newgoal{suffix + 1}"
        return candidate

    async def create_goal(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        goal_data: GoalCreate,
    ) -> Goal | None:
        name = goal_data.name
        if name:
            existing_goal = await self.get_goal_by_name(db, name, user_id)
            if existing_goal:
                return None
        else:
            name = await self._generate_default_name(db, user_id)

        goal = Goal(
            name=name,
            description=goal_data.description,
            user_id=user_id,
        )
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    async def list_goals(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> Sequence[Goal]:
        stmt: Select[tuple[Goal]] = select(Goal).where(
            and_(Goal.user_id == user_id, Goal.is_deleted.is_(False))
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_goal(
        self,
        db: AsyncSession,
        goal_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Goal | None:
        stmt: Select[tuple[Goal]] = select(Goal).where(
            and_(Goal.id == goal_id, Goal.user_id == user_id, Goal.is_deleted.is_(False))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_goal_by_name(
        self,
        db: AsyncSession,
        name: str,
        user_id: uuid.UUID,
    ) -> Goal | None:
        stmt: Select[tuple[Goal]] = select(Goal).where(
            and_(Goal.name == name, Goal.user_id == user_id, Goal.is_deleted.is_(False))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_goal(
        self,
        db: AsyncSession,
        goal_id: uuid.UUID,
        user_id: uuid.UUID,
        goal_data: GoalUpdate,
    ) -> Goal | None:
        goal = await self.get_goal(db, goal_id, user_id)
        if not goal:
            return None

        if goal_data.name is not None:
            existing_goal = await self.get_goal_by_name(db, goal_data.name, user_id)
            if existing_goal and bool(existing_goal.id != goal.id):
                raise ValueError("Goal name already exists")
            goal.name = goal_data.name

        if "description" in goal_data.model_fields_set:
            goal.description = goal_data.description

        await db.commit()
        await db.refresh(goal)
        return goal

    async def delete_goal(
        self,
        db: AsyncSession,
        goal_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        goal = await self.get_goal(db, goal_id, user_id)
        if not goal:
            return False

        goal.soft_delete()
        await db.commit()
        return True
