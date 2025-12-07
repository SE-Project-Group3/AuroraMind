from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field


class BreakdownRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Free-form text to break down")
    model: str | None = Field(
        default=None, description="Optional model override for the AI provider"
    )
    extra: dict[str, Any] | None = Field(
        default=None, description="Optional extra parameters forwarded to AI"
    )


class BreakdownItem(BaseModel):
    order: int
    text: str


class BreakdownResponse(BaseModel):
    goal_id: uuid.UUID
    items: list[BreakdownItem]
