from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field, field_validator


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


class BreakdownSelectionItem(BaseModel):
    order: int
    text: str = Field(..., min_length=1)


class BreakdownSelectionRequest(BaseModel):
    task_list_id: uuid.UUID | None = Field(
        default=None, description="Existing task list under the goal to reuse"
    )
    task_list_name: str | None = Field(
        default=None,
        description="Name for a new task list if task_list_id is not provided",
        min_length=1,
        max_length=255,
    )
    items: list[BreakdownSelectionItem] = Field(..., min_length=1)

    @field_validator("task_list_id", mode="before")
    @classmethod
    def _empty_uuid_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("task_list_name", mode="before")
    @classmethod
    def _empty_name_to_none(cls, v: Any) -> Any:
        if isinstance(v, str) and not v.strip():
            return None
        return v


class BreakdownSelectionResponse(BaseModel):
    goal_id: uuid.UUID
    task_list: uuid.UUID
    tasks: list[uuid.UUID]
