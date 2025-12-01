from datetime import datetime
import uuid

from pydantic import BaseModel, Field


class TaskListBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    goal_id: uuid.UUID | None = None


class TaskListCreate(TaskListBase):
    pass


class TaskListUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    goal_id: uuid.UUID | None = None


class TaskListGoalUpdate(BaseModel):
    goal_id: uuid.UUID | None = None


class TaskListResponse(TaskListBase):
    id: uuid.UUID
    user_id: uuid.UUID
    goal_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
