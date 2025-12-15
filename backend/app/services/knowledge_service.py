from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path
from typing import Sequence

from fastapi import UploadFile, HTTPException, status
import httpx
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.knowledge_document import KnowledgeDocument
from app.services.embedding_service import EmbeddingService
from app.services.knowledge_ingestion_utils import extract_text_from_path, split_text

def _make_storage_dir(user_id: uuid.UUID) -> Path:
    base = Path(settings.KNOWLEDGE_STORAGE_ROOT).expanduser().resolve()
    user_dir = base / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def _build_unique_filename(target_dir: Path, original_name: str) -> tuple[str, Path]:
    """
    Store files using timestamped names; collisions are practically avoided by microseconds.
    Example: report_20241208_153045123456.pdf
    """
    safe_name = Path(original_name).name
    stem = Path(safe_name).stem
    suffix = Path(safe_name).suffix

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S%f")
    stored = f"{stem}_{timestamp}{suffix}"
    return stored, target_dir / stored


class KnowledgeService:
    def __init__(self, embedding_service: EmbeddingService | None = None) -> None:
        self.embedding_service = embedding_service

    def _get_embedding_service(self) -> EmbeddingService:
        if self.embedding_service is None:
            self.embedding_service = EmbeddingService()
        return self.embedding_service

    async def upload_document(
        self, db: AsyncSession, user_id: uuid.UUID, file: UploadFile
    ) -> KnowledgeDocument:
        user_dir = _make_storage_dir(user_id)
        stored_filename, target_path = _build_unique_filename(
            user_dir, file.filename or "upload"
        )

        content = await file.read()
        target_path.write_bytes(content)

        document = KnowledgeDocument(
            user_id=user_id,
            original_filename=file.filename or stored_filename,
            stored_filename=stored_filename,
            file_path=str(target_path),
            mime_type=file.content_type,
            file_size=len(content),
            status="processing",
            ingest_progress=0,
            chunk_count=0,
            error_message=None,
        )
        db.add(document)
        await db.commit()
        await db.refresh(document)

        # Enqueue ingestion as a Celery task so the frontend can poll status/progress.
        from app.tasks.knowledge_ingest import ingest_document

        ingest_document.delay(str(document.id))  # type: ignore[attr-defined]

        return document

    async def get_document(
        self, db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID
    ) -> KnowledgeDocument | None:
        stmt = select(KnowledgeDocument).where(
            KnowledgeDocument.id == document_id,
            KnowledgeDocument.user_id == user_id,
            KnowledgeDocument.is_deleted.is_(False),
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_documents(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> Sequence[KnowledgeDocument]:
        stmt = (
            select(KnowledgeDocument)
            .where(
                and_(
                    KnowledgeDocument.user_id == user_id,
                    KnowledgeDocument.is_deleted.is_(False),
                )
            )
            .order_by(KnowledgeDocument.created_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def delete_document(
        self, db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID
    ) -> None:
        stmt = (
            select(KnowledgeDocument)
            .options(selectinload(KnowledgeDocument.chunks))
            .where(
                KnowledgeDocument.id == document_id,
                KnowledgeDocument.user_id == user_id,
                KnowledgeDocument.is_deleted.is_(False),
            )
        )
        result = await db.execute(stmt)
        document = result.scalar_one_or_none()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        # Soft delete DB rows
        document.soft_delete()
        for chunk in document.chunks:
            chunk.soft_delete()

        await db.commit()

        # Best-effort delete file on disk (ignore failures)
        try:
            path = Path(document.file_path)
            if path.exists():
                path.unlink()
        except Exception:
            pass

    async def ensure_document_path(
        self, db: AsyncSession, user_id: uuid.UUID, document_id: uuid.UUID
    ) -> Path:
        document = await self.get_document(db, user_id, document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )
        path = Path(document.file_path)
        if not path.exists():
            raise HTTPException(
                status_code=status.HTTP_410_GONE, detail="Document file missing"
            )
        return path

    async def search(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        query: str,
        top_k: int = 5,
        document_id: uuid.UUID | None = None,
    ) -> list[tuple[KnowledgeChunk, KnowledgeDocument, float]]:
        if top_k <= 0:
            top_k = 5
        query_embedding = await self._get_embedding_service().embed_texts([query])
        if not query_embedding:
            return []
        embedding = query_embedding[0]

        distance = KnowledgeChunk.embedding.cosine_distance(embedding)
        stmt = (
            select(
                KnowledgeChunk,
                KnowledgeDocument,
                distance.label("score"),
            )
            .join(
                KnowledgeDocument,
                KnowledgeChunk.document_id == KnowledgeDocument.id,
            )
            .where(
                KnowledgeDocument.user_id == user_id,
                KnowledgeDocument.is_deleted.is_(False),
                KnowledgeDocument.status == "ready",
                KnowledgeChunk.is_deleted.is_(False),
            )
            .order_by(distance)
            .limit(top_k)
        )
        if document_id:
            stmt = stmt.where(KnowledgeDocument.id == document_id)

        result = await db.execute(stmt)
        rows = result.all()
        return [(row[0], row[1], float(row[2])) for row in rows]

    async def answer_with_dify(
        self,
        question: str,
        contexts: list[KnowledgeChunk],
    ) -> str:
        if not settings.DIFY_KB_API_URL or not settings.DIFY_API_KEY:
            raise RuntimeError("Dify KB API not configured")

        context_text = "\n\n".join([c.content for c in contexts])
        payload = {
            "inputs": {
                "question": question,
                "context": context_text,
            },
            "response_mode": "blocking",
            "conversation_id": None,
        }
        headers = {
            "Authorization": f"Bearer {settings.DIFY_API_KEY}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                settings.DIFY_KB_API_URL, json=payload, headers=headers
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"Dify call failed: {resp.status_code} {resp.text}")
            data = resp.json()
    
            return data.get("answer") or data.get("output") or ""

