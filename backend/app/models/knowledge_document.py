from __future__ import annotations

import uuid

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.knowledge_chunk import KnowledgeChunk
    from app.models.goal import Goal


class KnowledgeDocument(BaseModel):
    __tablename__ = "knowledge_documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="owner id",
    )
    goal_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("goals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="optional related goal id",
    )
    original_filename: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="original filename from upload"
    )
    stored_filename: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="filename stored on disk (with timestamp/disambiguation)"
    )
    file_path: Mapped[str] = mapped_column(
        String(512), nullable=False, comment="absolute path of the stored file"
    )
    mime_type: Mapped[str | None] = mapped_column(
        String(128), nullable=True, comment="mime type from upload"
    )
    file_size: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="file size in bytes"
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="ready", comment="ingestion status"
    )
    ingest_progress: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="ingestion progress percent (0-100)"
    )
    chunk_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="total chunks generated for this document"
    )
    error_message: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="ingestion error (if failed)"
    )

    chunks: Mapped[list["KnowledgeChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )
    goal: Mapped["Goal | None"] = relationship()

