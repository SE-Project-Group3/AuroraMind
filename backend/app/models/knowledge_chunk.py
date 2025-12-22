from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import Index, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.knowledge_document import KnowledgeDocument


class KnowledgeChunk(BaseModel):
    __tablename__ = "knowledge_chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_documents.id", ondelete="CASCADE"),
        nullable=False,
        comment="related document id",
    )
    chunk_index: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="chunk order in document"
    )
    content: Mapped[str] = mapped_column(
        Text, nullable=False, comment="chunk text content"
    )
    embedding: Mapped[list[float]] = mapped_column(
        Vector(settings.EMBEDDING_DIM), nullable=False, comment="vector embedding"
    )

    document: Mapped["KnowledgeDocument"] = relationship(back_populates="chunks")

    __table_args__ = (Index("ix_knowledge_chunks_document_id", "document_id"),)

