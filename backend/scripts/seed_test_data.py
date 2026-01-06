from __future__ import annotations

import sys
from pathlib import Path
import random
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.db import Sync_session
from app.core.security import get_hashed_password
from app.models.goal import Goal
from app.models.summary import Summary
from app.models.task import Task
from app.models.task_list import TaskList
from app.models.user import User


SEED_START = datetime(2025, 12, 15, tzinfo=timezone.utc)
SEED_END = datetime(2026, 1, 6, tzinfo=timezone.utc)


GOAL_BLUEPRINTS = [
    {
        "name": "Python Mastery",
        "task_list": "Python Learning Plan",
        "tasks": [
            "Learn Python syntax and variables",
            "Practice lists, tuples, and dictionaries",
            "Understand functions and modules",
            "Explore file I/O and exceptions",
            "Write a small CLI utility",
            "Review OOP basics in Python",
            "Solve 5 algorithm problems",
        ],
    },
    {
        "name": "Read Design Patterns Book",
        "task_list": "Design Patterns Reading",
        "tasks": [
            "Read chapters 1-2",
            "Summarize Singleton and Factory patterns",
            "Implement Strategy pattern example",
            "Review Observer and Decorator patterns",
            "Write notes on real-world use cases",
            "Create a study summary",
        ],
    },
    {
        "name": "Build a Personal Portfolio",
        "task_list": "Portfolio Build",
        "tasks": [
            "Draft site structure and sections",
            "Create a clean landing page layout",
            "Add project showcase section",
            "Write an about me section",
            "Publish the site",
            "Add a contact form",
        ],
    },
    {
        "name": "Improve Health Routine",
        "task_list": "Health Upgrade",
        "tasks": [
            "Plan a weekly workout schedule",
            "Complete three cardio sessions",
            "Track daily water intake",
            "Prepare healthy meals for the week",
            "Sleep at least 7 hours for five nights",
            "Stretch for 10 minutes daily",
        ],
    },
    {
        "name": "Finish Side Project MVP",
        "task_list": "Side Project Sprint",
        "tasks": [
            "Define MVP feature list",
            "Set up project repository",
            "Build core API endpoints",
            "Implement basic UI layout",
            "Add user authentication",
            "Deploy MVP to staging",
            "Write usage documentation",
        ],
    },
]


def _random_datetime(start: datetime, end: datetime) -> datetime:
    delta_seconds = int((end - start).total_seconds())
    return start + timedelta(seconds=random.randint(0, delta_seconds))


def _iso_week_label(d: date) -> tuple[str, int, int]:
    iso_year, iso_week, _ = d.isocalendar()
    return f"{iso_year}-W{iso_week:02d}", iso_year, iso_week


def _ensure_unique_goal_name(existing: set[str], base: str) -> str:
    if base not in existing:
        existing.add(base)
        return base
    suffix = 1
    candidate = f"{base} ({suffix})"
    while candidate in existing:
        suffix += 1
        candidate = f"{base} ({suffix})"
    existing.add(candidate)
    return candidate


def main() -> None:
    random.seed(42)
    completion_patterns = [1.0, 0.5, 0.0]

    with Sync_session() as db:
        user = db.execute(
            select(User).where(User.email == "test@example.com")
        ).scalar_one_or_none()
        if not user:
            user = User(
                username="test_user",
                email="test@example.com",
                hashed_password=get_hashed_password("password"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        existing_goal_names = {
            row[0]
            for row in db.execute(
                select(Goal.name).where(
                    Goal.user_id == user.id, Goal.is_deleted.is_(False)
                )
            ).all()
        }

        goals_created = 0
        tasks_created = 0

        for blueprint in GOAL_BLUEPRINTS:
            goal_name = _ensure_unique_goal_name(existing_goal_names, blueprint["name"])
            goal = Goal(
                name=goal_name,
                description=f"{goal_name} plan",
                user_id=user.id,
                created_at=_random_datetime(SEED_START, SEED_END),
                updated_at=_random_datetime(SEED_START, SEED_END),
            )
            db.add(goal)
            db.commit()
            db.refresh(goal)
            goals_created += 1

            task_list = TaskList(
                name=blueprint["task_list"],
                user_id=user.id,
                goal_id=goal.id,
                created_at=_random_datetime(SEED_START, SEED_END),
                updated_at=_random_datetime(SEED_START, SEED_END),
            )
            db.add(task_list)
            db.commit()
            db.refresh(task_list)

            total_tasks = random.randint(4, 7)
            tasks_pool = blueprint["tasks"][:]
            random.shuffle(tasks_pool)
            selected_tasks = tasks_pool[:total_tasks]
            completion_ratio = random.choice(completion_patterns)
            completed_count = int(round(total_tasks * completion_ratio))

            for idx, task_name in enumerate(selected_tasks, start=1):
                is_completed = idx <= completed_count
                created_at = _random_datetime(SEED_START, SEED_END)
                completed_at = (
                    _random_datetime(SEED_START, SEED_END) if is_completed else None
                )
                task = Task(
                    name=task_name,
                    is_completed=is_completed,
                    user_id=user.id,
                    task_list_id=task_list.id,
                    start_date=created_at,
                    end_date=created_at + timedelta(days=3),
                    completed_at=completed_at,
                    created_at=created_at,
                    updated_at=completed_at or created_at,
                )
                db.add(task)
                tasks_created += 1

            db.commit()

        weekly_start = date(2025, 12, 22)
        weekly_end = date(2025, 12, 28)
        weekly_label, weekly_year, weekly_week = _iso_week_label(weekly_start)

        monthly_start = date(2025, 12, 1)
        monthly_end = date(2025, 12, 31)

        summaries = [
            {
                "summary_type": "weekly",
                "period_start": weekly_start,
                "period_end": weekly_end,
                "period_label": weekly_label,
                "period_year": weekly_year,
                "period_week": weekly_week,
                "period_month": None,
                "content": "Steady progress on goals with a mix of completed tasks and pending items.",
            },
            {
                "summary_type": "monthly",
                "period_start": monthly_start,
                "period_end": monthly_end,
                "period_label": "2025-12",
                "period_year": 2025,
                "period_week": None,
                "period_month": 12,
                "content": "Consistent effort across goals with visible momentum in learning and delivery.",
            },
        ]

        for summary_data in summaries:
            existing = db.execute(
                select(Summary).where(
                    Summary.user_id == user.id,
                    Summary.summary_type == summary_data["summary_type"],
                    Summary.period_start == summary_data["period_start"],
                    Summary.is_deleted.is_(False),
                )
            ).scalar_one_or_none()
            if existing:
                for key, value in summary_data.items():
                    setattr(existing, key, value)
                existing.status = "ready"
                existing.updated_at = datetime.now(timezone.utc)
                continue

            summary = Summary(
                user_id=user.id,
                status="ready",
                error_message=None,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                **summary_data,
            )
            db.add(summary)

        db.commit()

    print(
        f"Seeded user={user.email}, goals={goals_created}, tasks={tasks_created}, summaries=2"
    )


if __name__ == "__main__":
    main()
