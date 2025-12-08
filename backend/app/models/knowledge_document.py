from __future__ import annotations

import uuid

from typing import TYPE_CHECKING

from sqlalchemy import Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.knowledge_chunk import KnowledgeChunk


class KnowledgeDocument(BaseModel):
    __tablename__ = "knowledge_documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        comment="owner id",
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

    chunks: Mapped[list["KnowledgeChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )

