from datetime import datetime
import uuid

from pydantic import BaseModel, Field


class PhaseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class PhaseCreate(BaseModel):
    goal_id: uuid.UUID
    name: str | None = Field(None, min_length=1, max_length=255)


class PhaseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)


class PhaseResponse(BaseModel):
    id: uuid.UUID
    goal_id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
