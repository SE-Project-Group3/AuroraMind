from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Sequence, AsyncIterator, Any

from fastapi import UploadFile, HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.goal import Goal
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.knowledge_document import KnowledgeDocument
from app.schemas.knowledge import KnowledgeContext
from app.services.ai_service import DifyAIService
from app.services.embedding_service import EmbeddingService

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
    def __init__(
        self,
        embedding_service: EmbeddingService | None = None,
        ai_service: DifyAIService | None = None,
    ) -> None:
        self.embedding_service = embedding_service
        self.ai_service = ai_service

    def _get_embedding_service(self) -> EmbeddingService:
        if self.embedding_service is None:
            self.embedding_service = EmbeddingService()
        return self.embedding_service

    def _get_ai_service(self) -> DifyAIService:
        if self.ai_service is None:
            self.ai_service = DifyAIService()
        return self.ai_service

    async def upload_document(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        file: UploadFile,
        goal_id: uuid.UUID | None = None,
    ) -> KnowledgeDocument:
        if goal_id is not None:
            stmt = select(Goal.id).where(
                Goal.id == goal_id,
                Goal.user_id == user_id,
                Goal.is_deleted.is_(False),
            )
            result = await db.execute(stmt)
            if result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
                )

        user_dir = _make_storage_dir(user_id)
        stored_filename, target_path = _build_unique_filename(
            user_dir, file.filename or "upload"
        )

        content = await file.read()
        target_path.write_bytes(content)

        document = KnowledgeDocument(
            user_id=user_id,
            goal_id=goal_id,
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

    async def update_document_goal(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        goal_id: uuid.UUID | None,
    ) -> KnowledgeDocument:
        document = await self.get_document(db, user_id, document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
            )

        if goal_id is not None:
            stmt = select(Goal.id).where(
                Goal.id == goal_id,
                Goal.user_id == user_id,
                Goal.is_deleted.is_(False),
            )
            result = await db.execute(stmt)
            if result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
                )

        document.goal_id = goal_id
        await db.commit()
        await db.refresh(document)
        return document

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

    async def list_documents_by_goal(
        self, db: AsyncSession, user_id: uuid.UUID, goal_id: uuid.UUID
    ) -> Sequence[KnowledgeDocument]:
        stmt = (
            select(KnowledgeDocument)
            .where(
                and_(
                    KnowledgeDocument.user_id == user_id,
                    KnowledgeDocument.goal_id == goal_id,
                    KnowledgeDocument.is_deleted.is_(False),
                )
            )
            .order_by(KnowledgeDocument.created_at.desc())
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def list_documents_unassigned(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> Sequence[KnowledgeDocument]:
        stmt = (
            select(KnowledgeDocument)
            .where(
                and_(
                    KnowledgeDocument.user_id == user_id,
                    KnowledgeDocument.goal_id.is_(None),
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

        document.soft_delete()
        for chunk in document.chunks:
            chunk.soft_delete()

        await db.commit()

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

    def _build_context_text(
        self, contexts: list[KnowledgeChunk], *, max_chars: int
    ) -> str:
        if max_chars <= 0:
            return ""
        parts: list[str] = []
        used = 0
        for c in contexts:
            if not c.content:
                continue
            chunk = c.content
            remaining = max_chars - used
            if remaining <= 0:
                break
            if len(chunk) > remaining:
                chunk = chunk[:remaining]
            parts.append(chunk)
            used += len(chunk)
            if used >= max_chars:
                break
        return "\n\n".join(parts)

    async def conversation_sse(
        self,
        *,
        db: AsyncSession,
        user_id: uuid.UUID,
        question: str,
        top_k: int = 3,
        document_id: uuid.UUID | None = None,
        conversation_id: str | None = None,
        max_context_chars: int = 12000,
        timeout_s: float = 60,
    ) -> AsyncIterator[str]:
        """
        Server-Sent Events stream generator:
        - event: context  (single JSON payload with retrieved contexts)
        - event: meta     (conversation_id)
        - event: delta    (JSON string chunks)
        - event: done
        - event: error
        """
        try:
            results = await self.search(
                db=db,
                user_id=user_id,
                query=question,
                top_k=top_k,
                document_id=document_id,
            )
            contexts = [
                KnowledgeContext(
                    document_id=chunk.document_id,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    score=float(score),
                    stored_filename=document.stored_filename,
                    original_filename=document.original_filename,
                )
                for chunk, document, score in results
            ]

            yield (
                "event: context\n"
                + "data: "
                + json.dumps(
                    {"contexts": [c.model_dump(mode="json") for c in contexts]},
                    ensure_ascii=False,
                )
                + "\n\n"
            )

            chunk_entities = [item[0] for item in results]
            context_text = self._build_context_text(
                chunk_entities, max_chars=max_context_chars
            )
            dify_query = "question:" + question + "\n\ncontext:" + context_text

            async for event in self._get_ai_service().stream_knowledgebase_chat(
                query=dify_query,
                user_id=str(user_id),
                conversation_id=conversation_id,
                timeout_s=timeout_s,
            ):
                if event.get("type") == "meta":
                    yield (
                        "event: meta\n"
                        + "data: "
                        + json.dumps(
                            {"conversation_id": event.get("conversation_id")},
                            ensure_ascii=False,
                        )
                        + "\n\n"
                    )
                elif event.get("type") == "delta":
                    yield (
                        "event: delta\n"
                        + "data: "
                        + json.dumps({"text": event.get("text")}, ensure_ascii=False)
                        + "\n\n"
                    )

            yield (
                "event: done\n"
                + "data: "
                + json.dumps({"ok": True}, ensure_ascii=False)
                + "\n\n"
            )
        except Exception as e:
            yield (
                "event: error\n"
                + "data: "
                + json.dumps({"error": str(e)}, ensure_ascii=False)
                + "\n\n"
            )

