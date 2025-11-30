from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.schema import ForeignKey
import uuid

from .base import BaseModel


class Goal(BaseModel):
    __tablename__ = "goals"

    name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="name of the goal"
    )
    description: Mapped[str | None] = mapped_column(
        String(1024), nullable=True, comment="goal description"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, comment="owner id"
    )
