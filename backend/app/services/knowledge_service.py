from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Sequence, AsyncIterator, Any

from fastapi import UploadFile, HTTPException, status
import httpx
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.goal import Goal
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.knowledge_document import KnowledgeDocument
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
    def __init__(self, embedding_service: EmbeddingService | None = None) -> None:
        self.embedding_service = embedding_service

    def _get_embedding_service(self) -> EmbeddingService:
        if self.embedding_service is None:
            self.embedding_service = EmbeddingService()
        return self.embedding_service

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

    def _dify_url(self) -> str:
        url = settings.DIFY_API_URL
        if not url:
            raise RuntimeError("Dify API url not configured")
        return url

    def _dify_headers(self) -> dict[str, str]:
        if not settings.DIFY_KB_API_KEY:
            raise RuntimeError("Dify KB Chat Application API key not configured")
        return {
            "Authorization": f"Bearer {settings.DIFY_KB_API_KEY}",
            "Content-Type": "application/json",
        }

    async def stream_answer_with_dify(
        self,
        question: str,
        contexts: list[KnowledgeChunk],
        user_id: uuid.UUID,
        conversation_id: str | None = None,
        *,
        timeout_s: float = 60,
    ) -> AsyncIterator[str]:
        async for event in self.stream_chat_with_dify(
            question=question,
            contexts=contexts,
            user_id=user_id,
            conversation_id=conversation_id,
            timeout_s=timeout_s,
        ):
            if event.get("type") == "delta":
                text = event.get("text")
                if isinstance(text, str) and text:
                    yield text

    async def stream_chat_with_dify(
        self,
        *,
        question: str,
        contexts: list[KnowledgeChunk],
        user_id: uuid.UUID,
        conversation_id: str | None = None,
        timeout_s: float = 60,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Call Dify with response_mode="streaming".
        Yields events:
        - {"type": "meta", "conversation_id": "..."}
        - {"type": "delta", "text": "..."}
        """
        context_text = "\n\n".join([c.content for c in contexts])
        payload = {
            "inputs": {},
            "query": "question:" + question + "\n\ncontext:" + context_text,
            "response_mode": "streaming",
            "user": str(user_id),
            "conversation_id": conversation_id,
        }

        last_answer = ""
        sent_conversation_id: str | None = None

        if conversation_id:
            sent_conversation_id = conversation_id
            yield {"type": "meta", "conversation_id": conversation_id}

        async with httpx.AsyncClient(timeout=timeout_s) as client:
            async with client.stream(
                "POST", self._dify_url(), json=payload, headers=self._dify_headers()
            ) as resp:
                if resp.status_code >= 400:
                    body = await resp.aread()
                    raise RuntimeError(
                        f"Dify call failed: {resp.status_code} {body.decode('utf-8', errors='ignore')}"
                    )

                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data:"):
                        line = line[len("data:") :].strip()
                    if line == "[DONE]":
                        break

                    try:
                        data = json.loads(line)
                    except Exception:
                        continue

                    cid = data.get("conversation_id")
                    if (
                        isinstance(cid, str)
                        and cid
                        and sent_conversation_id is None
                    ):
                        sent_conversation_id = cid
                        yield {"type": "meta", "conversation_id": cid}

                    answer = data.get("answer")
                    if isinstance(answer, str):
                        if answer.startswith(last_answer):
                            delta = answer[len(last_answer) :]
                        else:
                            delta = answer
                        last_answer = answer
                        if delta:
                            yield {"type": "delta", "text": delta}

