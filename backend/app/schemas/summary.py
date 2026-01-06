from __future__ import annotations

from datetime import date, datetime
import uuid
from enum import Enum

from pydantic import BaseModel, Field


class SummaryType(str, Enum):
    weekly = "weekly"
    monthly = "monthly"


class SummaryResponse(BaseModel):
    id: uuid.UUID
    summary_type: SummaryType
    period_start: date
    period_end: date
    period_label: str
    period_year: int
    period_week: int | None = None
    period_month: int | None = None
    content: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SummaryGenerateRequest(BaseModel):
    summary_type: SummaryType
    period_start: date | None = None
    period_end: date | None = None
    force: bool = Field(False, description="regenerate even if existing")
