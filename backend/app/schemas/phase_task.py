from datetime import datetime
import uuid

from pydantic import BaseModel, Field


class PhaseTaskBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    is_completed: bool = False


class PhaseTaskCreate(BaseModel):
    phase_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=255)
    is_completed: bool = False


class PhaseTaskUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    is_completed: bool | None = None


class PhaseTaskResponse(BaseModel):
    id: uuid.UUID
    phase_id: uuid.UUID
    name: str
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
