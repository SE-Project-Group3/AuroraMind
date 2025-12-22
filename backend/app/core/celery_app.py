from __future__ import annotations

from celery import Celery

from app.core.config import settings


def _redis_url() -> str:
    # Use explicit CELERY_BROKER_URL if provided, otherwise derive from existing Redis settings.
    # Supports empty password.
    if getattr(settings, "CELERY_BROKER_URL", None):
        return str(settings.CELERY_BROKER_URL)

    pw = settings.REDIS_PASSWORD or ""
    auth = f":{pw}@" if pw else ""
    # Celery uses redis DB index; reuse REDIS_DB.
    return f"redis://{auth}{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"


celery_app = Celery(
    "auroramind",
    broker=_redis_url(),
    backend=getattr(settings, "CELERY_RESULT_BACKEND", None) or _redis_url(),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)

# Auto-discover tasks by importing `app.tasks` (package)
celery_app.autodiscover_tasks(["app"])


