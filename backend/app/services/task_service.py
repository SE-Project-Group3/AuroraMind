from __future__ import annotations

import uuid
from collections.abc import Sequence

from sqlalchemy import and_, select, func
from sqlalchemy.sql import Select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.models.task_list import TaskList
from app.models.base import utcnow
from app.services.goal_service import GoalService
from app.schemas.task import TaskCreate, TaskUpdate
from app.schemas.task_list import TaskListCreate, TaskListUpdate


class TaskListService:
    def __init__(self) -> None:
        self.goal_service = GoalService()

    async def create_task_list(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        task_list_data: TaskListCreate,
    ) -> TaskList | None:
        existing_task_list = await self.get_task_list_by_name(db, task_list_data.name, user_id)
        if existing_task_list:
            # Append suffix to avoid collision
            base = task_list_data.name
            suffix = 1
            candidate = f"{base} ({suffix})"
            while await self.get_task_list_by_name(db, candidate, user_id):
                suffix += 1
                candidate = f"{base} ({suffix})"
            task_list_data.name = candidate

        if task_list_data.goal_id:
            goal = await self.goal_service.get_goal(db, task_list_data.goal_id, user_id)
            if not goal:
                msg = "Goal not found for the current user"
                raise ValueError(msg)

        new_task_list = TaskList(
            name=task_list_data.name,
            user_id=user_id,
            goal_id=task_list_data.goal_id,
        )
        db.add(new_task_list)
        await db.commit()
        await db.refresh(new_task_list)
        return new_task_list

    async def list_task_lists(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        goal_id: uuid.UUID | None = None,
    ) -> Sequence[TaskList] | None:
        stmt: Select[tuple[TaskList]] = select(TaskList).where(
            and_(TaskList.user_id == user_id, TaskList.is_deleted.is_(False))
        )
        if goal_id:
            stmt = stmt.where(TaskList.goal_id == goal_id)
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_task_list(
        self,
        db: AsyncSession,
        task_list_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> TaskList | None:
        stmt: Select[tuple[TaskList]] = select(TaskList).where(
            and_(
                TaskList.id == task_list_id,
                TaskList.user_id == user_id,
                TaskList.is_deleted.is_(False),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_task_list_by_name(
        self,
        db: AsyncSession,
        name: str,
        user_id: uuid.UUID,
    ) -> TaskList | None:
        stmt: Select[tuple[TaskList]] = select(TaskList).where(
            and_(TaskList.name == name, TaskList.user_id == user_id, TaskList.is_deleted.is_(False))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_task_list(
        self,
        db: AsyncSession,
        task_list_id: uuid.UUID,
        user_id: uuid.UUID,
        task_list_data: TaskListUpdate,
    ) -> TaskList | None:
        task_list = await self.get_task_list(db, task_list_id, user_id)
        if not task_list:
            return None

        if task_list_data.name is not None:
            task_list.name = task_list_data.name

        if "goal_id" in task_list_data.model_fields_set:
            if task_list_data.goal_id is not None:
                goal = await self.goal_service.get_goal(db, task_list_data.goal_id, user_id)
                if not goal:
                    msg = "Goal not found for the current user"
                    raise ValueError(msg)
            task_list.goal_id = task_list_data.goal_id

        await db.commit()
        await db.refresh(task_list)
        return task_list

    async def delete_task_list(
        self,
        db: AsyncSession,
        task_list_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        task_list = await self.get_task_list(db, task_list_id, user_id)
        if not task_list:
            return False

        task_list.soft_delete()
        await db.commit()
        return True


class TaskService:
    def __init__(self) -> None:
        self.task_list_service = TaskListService()

    async def create_task(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        task_data: TaskCreate,
    ) -> Task:
        task_list = await self.task_list_service.get_task_list(
            db, task_data.task_list_id, user_id
        )
        if not task_list:
            msg = "Task list not found for the current user"
            raise ValueError(msg)

        new_task = Task(
            name=task_data.name,
            is_completed=task_data.is_completed,
            user_id=user_id,
            task_list_id=task_data.task_list_id,
            end_date=task_data.end_date,
        )
        if task_data.start_date:
            new_task.start_date = task_data.start_date

        db.add(new_task)
        await db.commit()
        await db.refresh(new_task)
        return new_task

    async def list_tasks(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        task_list_id: uuid.UUID | None = None,
    ) -> Sequence[Task]:
        stmt: Select[tuple[Task]] = select(Task).where(
            and_(Task.user_id == user_id, Task.is_deleted.is_(False))
        )
        if task_list_id:
            stmt = stmt.where(Task.task_list_id == task_list_id)

        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_task(
        self,
        db: AsyncSession,
        task_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Task | None:
        stmt: Select[tuple[Task]] = select(Task).where(
            and_(
                Task.id == task_id,
                Task.user_id == user_id,
                Task.is_deleted.is_(False),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def count_pending_tasks(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> int:
        stmt = select(func.count()).select_from(Task).where(
            and_(
                Task.user_id == user_id,
                Task.is_completed.is_(False),
                Task.is_deleted.is_(False),
            )
        )
        result = await db.execute(stmt)
        return int(result.scalar_one() or 0)

    async def count_overdue_tasks(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> int:
        stmt = select(func.count()).select_from(Task).where(
            and_(
                Task.user_id == user_id,
                Task.is_completed.is_(False),
                Task.is_deleted.is_(False),
                Task.end_date.is_not(None),
                Task.end_date < func.now(),
            )
        )
        result = await db.execute(stmt)
        return int(result.scalar_one() or 0)

    async def count_completed_tasks(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> int:
        stmt = select(func.count()).select_from(Task).where(
            and_(
                Task.user_id == user_id,
                Task.is_completed.is_(True),
                Task.is_deleted.is_(False),
            )
        )
        result = await db.execute(stmt)
        return int(result.scalar_one() or 0)

    async def count_tasks_by_goal(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        goal_id: uuid.UUID,
    ) -> tuple[int, int]:
        """
        Returns (total_tasks, completed_tasks) for all tasks under the goal's task lists.
        Phase tasks are stored separately, so they are naturally excluded.
        """
        stmt = (
            select(
                func.count().label("total"),
                func.count().filter(Task.is_completed.is_(True)).label("completed"),
            )
            .select_from(Task)
            .join(TaskList, Task.task_list_id == TaskList.id)
            .where(
                Task.user_id == user_id,
                Task.is_deleted.is_(False),
                TaskList.is_deleted.is_(False),
                TaskList.goal_id == goal_id,
            )
        )
        result = await db.execute(stmt)
        row = result.one()
        total = int(row.total or 0)
        completed = int(row.completed or 0)
        return total, completed

    async def update_task(
        self,
        db: AsyncSession,
        task_id: uuid.UUID,
        user_id: uuid.UUID,
        task_data: TaskUpdate,
    ) -> Task | None:
        task = await self.get_task(db, task_id, user_id)
        if not task:
            return None

        if task_data.name is not None:
            task.name = task_data.name
        if task_data.is_completed is not None:
            task.is_completed = task_data.is_completed
        if task_data.start_date is not None:
            task.start_date = task_data.start_date
        if task_data.end_date is not None:
            task.end_date = task_data.end_date
        if task_data.task_list_id is not None:
            task_list = await self.task_list_service.get_task_list(
                db, task_data.task_list_id, user_id
            )
            if not task_list:
                msg = "Target task list not found for the current user"
                raise ValueError(msg)
            task.task_list_id = task_data.task_list_id

        await db.commit()
        await db.refresh(task)
        return task

    async def delete_task(
        self,
        db: AsyncSession,
        task_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        task = await self.get_task(db, task_id, user_id)
        if not task:
            return False

        task.soft_delete()
        await db.commit()
        return True
