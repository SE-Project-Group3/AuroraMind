"""
Celery tasks package.

Celery autodiscovery will import `app.tasks` (this package). Import task modules here
to ensure workers register them.
"""

from app.tasks import knowledge_ingest as knowledge_ingest  # noqa: F401


