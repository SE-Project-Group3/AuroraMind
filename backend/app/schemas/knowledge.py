from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class KnowledgeDocumentResponse(BaseModel):
    id: uuid.UUID
    original_filename: str
    stored_filename: str
    mime_type: str | None = None
    file_size: int
    status: str
    ingest_progress: int = 0
    chunk_count: int = 0
    error_message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class KnowledgeQueryRequest(BaseModel):
    question: str = Field(..., description="user question to search")
    top_k: int = Field(5, ge=1, le=20)
    document_id: uuid.UUID | None = None


class KnowledgeContext(BaseModel):
    document_id: uuid.UUID
    chunk_index: int
    content: str
    score: float
    stored_filename: str
    original_filename: str


class KnowledgeQueryResponse(BaseModel):
    answer: str
    contexts: list[KnowledgeContext]

