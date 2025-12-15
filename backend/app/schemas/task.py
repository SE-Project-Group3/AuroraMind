from datetime import datetime
import uuid

from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    is_completed: bool = False


class TaskCreate(TaskBase):
    task_list_id: uuid.UUID
    start_date: datetime | None = None
    end_date: datetime | None = None


class TaskUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    is_completed: bool | None = None
    task_list_id: uuid.UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class TaskResponse(TaskBase):
    id: uuid.UUID
    user_id: uuid.UUID
    task_list_id: uuid.UUID
    start_date: datetime | None = None
    end_date: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
