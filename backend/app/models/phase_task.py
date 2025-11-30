from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.schema import ForeignKey
import uuid

from .base import BaseModel


class PhaseTask(BaseModel):
    __tablename__ = "phase_tasks"

    name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="name of the phase task"
    )
    is_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, comment="phase task completion"
    )
    phase_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("phases.id"), nullable=False, comment="phase id"
    )
