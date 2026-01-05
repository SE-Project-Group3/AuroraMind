from datetime import date

from sqlalchemy import Date, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.schema import ForeignKey, UniqueConstraint
import uuid

from .base import BaseModel


class Summary(BaseModel):
    __tablename__ = "summaries"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "summary_type",
            "period_start",
            name="uq_summaries_user_type_start",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, comment="user id"
    )
    summary_type: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="weekly or monthly"
    )
    period_start: Mapped[date] = mapped_column(
        Date, nullable=False, comment="period start date (UTC)"
    )
    period_end: Mapped[date] = mapped_column(
        Date, nullable=False, comment="period end date (UTC)"
    )
    period_label: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="period label (e.g. 2025-W47 or 2025-12)"
    )
    period_year: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="period year (ISO year for weekly)"
    )
    period_week: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="ISO week number for weekly summaries"
    )
    period_month: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="month number for monthly summaries"
    )
    content: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="summary content"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", comment="pending/ready/failed"
    )
    error_message: Mapped[str | None] = mapped_column(
        String(2000), nullable=True, comment="error message when failed"
    )
