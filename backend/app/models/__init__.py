"""
Import all models so SQLAlchemy metadata is fully populated in any process
(FastAPI app, Celery worker, Alembic, scripts).
"""

# Base must be imported first to register metadata.
from app.models.base import Base, BaseModel  # noqa: F401

# Import all mapped models (side-effect: registers tables with metadata)
from app.models.user import User  # noqa: F401
from app.models.task_list import TaskList  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.phase import Phase  # noqa: F401
from app.models.phase_task import PhaseTask  # noqa: F401
from app.models.goal import Goal  # noqa: F401
from app.models.knowledge_document import KnowledgeDocument  # noqa: F401
from app.models.knowledge_chunk import KnowledgeChunk  # noqa: F401

