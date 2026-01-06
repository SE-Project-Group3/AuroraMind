from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.celery_app import celery_app
from app.core.db import Async_session
import app.models  # noqa: F401  (populate SQLAlchemy metadata)
from app.models.user import User
from app.schemas.summary import SummaryType
from app.services.summary_service import SummaryService

logger = logging.getLogger(__name__)


def _run(coro):
    # Celery runs in sync context; safe to create a loop.
    return asyncio.run(coro)


@celery_app.task(name="summaries.generate_missing", bind=True, acks_late=True)
def generate_missing(self) -> None:
    today = datetime.now(timezone.utc).date()
    _run(_generate_for_date(today))


async def _generate_for_date(today) -> None:
    service = SummaryService()
    async with Async_session() as db:
        result = await db.execute(
            select(User.id).where(User.is_deleted.is_(False))
        )
        user_ids = [row[0] for row in result.all()]

    for user_id in user_ids:
        async with Async_session() as db:
            for summary_type in (SummaryType.weekly, SummaryType.monthly):
                period = service.period_range_for_today(summary_type, today)
                if today != period.end:
                    continue
                existing = await service.get_summary(
                    db, user_id, summary_type, period.start
                )
                if existing and existing.status == "ready":
                    continue
                try:
                    await service.generate_summary(
                        db,
                        user_id,
                        summary_type,
                        period.start,
                        period.end,
                    )
                except Exception as exc:
                    logger.warning(
                        "summary generation failed user_id=%s type=%s error=%s",
                        user_id,
                        summary_type.value,
                        exc,
                    )
