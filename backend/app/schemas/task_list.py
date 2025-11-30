from datetime import datetime
import uuid

from pydantic import BaseModel, Field


class TaskListBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class TaskListCreate(TaskListBase):
    pass


class TaskListUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)


class TaskListResponse(TaskListBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

