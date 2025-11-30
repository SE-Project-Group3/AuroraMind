from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.schema import ForeignKey
import uuid

from .base import BaseModel


class Phase(BaseModel):
    __tablename__ = "phases"

    name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="name of the phase"
    )
    description: Mapped[str | None] = mapped_column(
        String(1024), nullable=True, comment="phase description"
    )
    goal_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("goals.id"), nullable=False, comment="goal id"
    )
