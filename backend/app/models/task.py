from sqlalchemy import Boolean, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.schema import ForeignKey
import uuid

from datetime import datetime
from .base import BaseModel, utcnow


class Task(BaseModel):
    __tablename__ = "tasks"
    name: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="title of the task"
    )
    is_completed: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, comment="task status"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, comment="user id"
    )
    task_list_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("task_lists.id"),
        nullable=False,
        comment="task list id",
    )
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=True,
        comment="start date of the task",
    )
    end_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="end date of the task"
    )
