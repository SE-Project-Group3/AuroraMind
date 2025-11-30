from datetime import datetime
import uuid

from pydantic import BaseModel, Field


class PhaseBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1024)


class PhaseCreate(BaseModel):
    goal_id: uuid.UUID
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1024)


class PhaseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1024)


class PhaseResponse(BaseModel):
    id: uuid.UUID
    goal_id: uuid.UUID
    name: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
