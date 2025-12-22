from __future__ import annotations

import asyncio
import uuid
from pathlib import Path

from sqlalchemy import update

from app.core.celery_app import celery_app
from app.core.db import Sync_session
from app.core.config import settings
import app.models  # noqa: F401  (populate SQLAlchemy metadata)
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.knowledge_document import KnowledgeDocument
from app.services.embedding_service import EmbeddingService
from app.utils.knowledge_ingestion import extract_text_from_path, split_text


def _run(coro):
    # Celery runs in normal sync context; safe to create a loop.
    return asyncio.run(coro)


@celery_app.task(name="knowledge.ingest_document", bind=True, acks_late=True)
def ingest_document(self, document_id: str) -> None:
    doc_id = uuid.UUID(document_id)

    with Sync_session() as db:
        document = db.get(KnowledgeDocument, doc_id)
        if not document or document.is_deleted:
            return

        try:
            document.status = "processing"
            document.ingest_progress = 0
            document.chunk_count = 0
            document.error_message = None
            db.commit()

            path = Path(document.file_path)
            text = extract_text_from_path(path, document.mime_type)
            chunks = split_text(
                text,
                chunk_size=settings.KNOWLEDGE_CHUNK_SIZE,
                overlap=settings.KNOWLEDGE_CHUNK_OVERLAP,
            )
            total = len(chunks)
            document.chunk_count = total
            db.commit()

            # Soft-delete existing chunks if re-ingesting
            db.execute(
                update(KnowledgeChunk)
                .where(
                    KnowledgeChunk.document_id == document.id,
                    KnowledgeChunk.is_deleted.is_(False),
                )
                .values(is_deleted=True)
            )
            db.commit()

            if total == 0:
                document.status = "ready"
                document.ingest_progress = 100
                db.commit()
                return

            embedder = EmbeddingService()
            batch_size = 64
            created = 0

            for start in range(0, total, batch_size):
                batch_chunks = chunks[start : start + batch_size]
                embeddings = _run(embedder.embed_texts(batch_chunks))
                if len(embeddings) != len(batch_chunks):
                    raise RuntimeError(
                        f"Embedding count mismatch: got {len(embeddings)} embeddings for {len(batch_chunks)} chunks"
                    )

                for idx_in_batch, (chunk, embedding) in enumerate(
                    zip(batch_chunks, embeddings)
                ):
                    db.add(
                        KnowledgeChunk(
                            document_id=document.id,
                            chunk_index=start + idx_in_batch,
                            content=chunk,
                            embedding=embedding,
                        )
                    )

                created = min(start + len(batch_chunks), total)
                document.ingest_progress = int(created * 100 / total)
                db.commit()

            document.status = "ready"
            document.ingest_progress = 100
            db.commit()
        except Exception as e:
            db.rollback()
            try:
                document = db.get(KnowledgeDocument, doc_id)
                if document:
                    document.status = "failed"
                    document.ingest_progress = 0
                    document.error_message = str(e)[:2000]
                    db.commit()
            except Exception:
                pass
            raise


