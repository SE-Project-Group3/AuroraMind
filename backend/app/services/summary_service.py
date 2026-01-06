from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from typing import Sequence

from sqlalchemy import and_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.goal import Goal
from app.models.task import Task
from app.models.task_list import TaskList
from app.models.summary import Summary
from app.schemas.summary import SummaryType
from app.services.ai_service import DifyAIService
from app.models.base import utcnow


@dataclass(frozen=True)
class PeriodRange:
    start: date
    end: date


class SummaryService:
    def __init__(self, ai_service: DifyAIService | None = None) -> None:
        self.ai_service = ai_service

    def _get_ai_service(self) -> DifyAIService:
        if self.ai_service is None:
            self.ai_service = DifyAIService()
        return self.ai_service

    def _current_week_range(self, today: date) -> PeriodRange:
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return PeriodRange(start=start, end=end)

    def _current_month_range(self, today: date) -> PeriodRange:
        start = today.replace(day=1)
        if start.month == 12:
            next_month = start.replace(year=start.year + 1, month=1)
        else:
            next_month = start.replace(month=start.month + 1)
        end = next_month - timedelta(days=1)
        return PeriodRange(start=start, end=end)

    def period_range_for_today(self, summary_type: SummaryType, today: date) -> PeriodRange:
        if summary_type == SummaryType.weekly:
            return self._current_week_range(today)
        return self._current_month_range(today)

    def _period_meta(
        self, summary_type: SummaryType, period_start: date
    ) -> tuple[str, int, int | None, int | None]:
        if summary_type == SummaryType.weekly:
            iso_year, iso_week, _ = period_start.isocalendar()
            label = f"{iso_year}-W{iso_week:02d}"
            return label, iso_year, iso_week, None
        label = f"{period_start.year}-{period_start.month:02d}"
        return label, period_start.year, None, period_start.month

    async def list_summaries(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        summary_type: SummaryType | None = None,
    ) -> Sequence[Summary]:
        stmt = select(Summary).where(
            Summary.user_id == user_id,
            Summary.is_deleted.is_(False),
        )
        if summary_type:
            stmt = stmt.where(Summary.summary_type == summary_type.value)
        stmt = stmt.order_by(Summary.period_start.desc())
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_summary(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        summary_type: SummaryType,
        period_start: date,
    ) -> Summary | None:
        stmt = select(Summary).where(
            Summary.user_id == user_id,
            Summary.summary_type == summary_type.value,
            Summary.period_start == period_start,
            Summary.is_deleted.is_(False),
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def generate_summary(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        summary_type: SummaryType,
        period_start: date,
        period_end: date,
        *,
        force: bool = False,
    ) -> Summary:
        existing = await self.get_summary(db, user_id, summary_type, period_start)
        if existing and not force and existing.status == "ready":
            return existing

        summary = existing
        period_label, period_year, period_week, period_month = self._period_meta(
            summary_type, period_start
        )
        if summary is None:
            summary = Summary(
                user_id=user_id,
                summary_type=summary_type.value,
                period_start=period_start,
                period_end=period_end,
                period_label=period_label,
                period_year=period_year,
                period_week=period_week,
                period_month=period_month,
                status="pending",
            )
            db.add(summary)
            await db.commit()
            await db.refresh(summary)
        else:
            summary.status = "pending"
            summary.error_message = None
            summary.period_end = period_end
            summary.period_label = period_label
            summary.period_year = period_year
            summary.period_week = period_week
            summary.period_month = period_month
            await db.commit()
            await db.refresh(summary)

        try:
            prompt = await self._build_prompt(
                db,
                user_id=user_id,
                summary_type=summary_type,
                period_start=period_start,
                period_end=period_end,
            )
            content = await self._get_ai_service().summary_text(
                text=prompt,
                user_id=str(user_id),
            )
            summary.content = content
            summary.status = "ready"
            summary.updated_at = utcnow()
            await db.commit()
            await db.refresh(summary)
            return summary
        except Exception as exc:
            summary.status = "failed"
            summary.error_message = str(exc)[:2000]
            summary.updated_at = utcnow()
            await db.commit()
            await db.refresh(summary)
            raise

    async def _build_prompt(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        summary_type: SummaryType,
        period_start: date,
        period_end: date,
    ) -> str:
        start_dt = datetime.combine(period_start, time.min, tzinfo=timezone.utc)
        end_dt = datetime.combine(period_end, time.max, tzinfo=timezone.utc)

        completed_ts = func.coalesce(Task.completed_at, Task.updated_at)
        task_stmt = (
            select(Task, TaskList, Goal)
            .join(TaskList, Task.task_list_id == TaskList.id)
            .outerjoin(Goal, TaskList.goal_id == Goal.id)
            .where(
                Task.user_id == user_id,
                Task.is_deleted.is_(False),
                Task.is_completed.is_(True),
                completed_ts >= start_dt,
                completed_ts <= end_dt,
            )
            .order_by(completed_ts.asc())
        )
        task_result = await db.execute(task_stmt)
        task_rows = task_result.all()

        goal_stmt = (
            select(Goal)
            .where(
                Goal.user_id == user_id,
                Goal.is_deleted.is_(False),
                Goal.created_at >= start_dt,
                Goal.created_at <= end_dt,
            )
            .order_by(Goal.created_at.asc())
        )
        goal_result = await db.execute(goal_stmt)
        goals = goal_result.scalars().all()

        goal_stats_stmt = (
            select(
                Goal.id,
                Goal.name,
                func.count(Task.id).label("total"),
                func.count(Task.id)
                .filter(Task.is_completed.is_(True))
                .label("completed"),
            )
            .select_from(Goal)
            .join(
                TaskList,
                and_(
                    TaskList.goal_id == Goal.id,
                    TaskList.is_deleted.is_(False),
                ),
                isouter=True,
            )
            .join(
                Task,
                and_(
                    Task.task_list_id == TaskList.id,
                    Task.is_deleted.is_(False),
                ),
                isouter=True,
            )
            .where(
                Goal.user_id == user_id,
                Goal.is_deleted.is_(False),
            )
            .group_by(Goal.id)
            .order_by(Goal.created_at.asc())
        )
        goal_stats_result = await db.execute(goal_stats_stmt)
        goal_stats = goal_stats_result.all()

        lines: list[str] = []
        period_label = "weekly" if summary_type == SummaryType.weekly else "monthly"
        label, _, _, _ = self._period_meta(summary_type, period_start)
        lines.append(
            f"You are writing a {period_label} summary for the user. Respond in English."
        )
        lines.append(f"Period label: {label}. Period (UTC): {period_start} to {period_end}.")
        lines.append(f"Completed tasks: {len(task_rows)}")
        if task_rows:
            lines.append("Task details:")
            for task, task_list, goal in task_rows[:200]:
                goal_name = goal.name if goal else "No goal"
                completed_at = task.completed_at or task.updated_at
                lines.append(
                    f"- {task.name} (goal: {goal_name}; list: {task_list.name}; completed_at: {completed_at})"
                )
            if len(task_rows) > 200:
                lines.append(f"...and {len(task_rows) - 200} more tasks.")
        else:
            lines.append("Task details: none.")

        lines.append(f"New goals created: {len(goals)}")
        if goals:
            lines.append("Goal details:")
            for goal in goals[:100]:
                desc = goal.description or ""
                desc_text = f" - {desc}" if desc else ""
                lines.append(f"- {goal.name}{desc_text}")
            if len(goals) > 100:
                lines.append(f"...and {len(goals) - 100} more goals.")
        else:
            lines.append("Goal details: none.")

        lines.append("Goal completion stats (overall):")
        if goal_stats:
            for goal_id, goal_name, total, completed in goal_stats[:100]:
                total_count = int(total or 0)
                completed_count = int(completed or 0)
                ratio = 0.0 if total_count == 0 else completed_count / total_count
                lines.append(
                    f"- {goal_name} ({completed_count}/{total_count}, {ratio:.0%})"
                )
            if len(goal_stats) > 100:
                lines.append(f"...and {len(goal_stats) - 100} more goals.")
        else:
            lines.append("Goal completion stats: none.")

        lines.append(
            "Write a concise summary in English (max 50 words). "
            "Include highlights and any patterns or suggestions if appropriate."
        )
        return "\n".join(lines)
