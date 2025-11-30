from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.schema import ForeignKey
import uuid

from .base import BaseModel


class TaskList(BaseModel):
    __tablename__ = "task_lists"

    name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="name of the task list"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, comment="user id"
    )
    goal_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("goals.id"),
        nullable=True,
        comment="linked goal id",
    )
