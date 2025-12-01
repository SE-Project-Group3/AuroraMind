from datetime import datetime
import uuid

from pydantic import BaseModel, Field


class GoalBase(BaseModel):
    description: str | None = Field(None, max_length=1024)


class GoalCreate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=1024)


class GoalUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=1024)


class GoalResponse(BaseModel):
    name: str
    description: str | None = None
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
