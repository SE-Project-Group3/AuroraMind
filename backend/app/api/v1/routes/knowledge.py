from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
import uuid

from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.db import AsyncSession, get_db
from app.schemas.common import StandardResponse, ok
from app.schemas.knowledge import (
    KnowledgeContext,
    KnowledgeConversationRequest,
    KnowledgeDocumentResponse,
    KnowledgeDocumentGoalUpdateRequest,
    KnowledgeQueryRequest,
    KnowledgeQueryResponse,
)
from app.schemas.user import UserResponse
from app.services.knowledge_service import KnowledgeService

router = APIRouter(prefix="/knowledge-base", tags=["knowledge_base"])
knowledge_service = KnowledgeService()


@router.post(
    "/documents",
    response_model=StandardResponse[KnowledgeDocumentResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    file: UploadFile = File(...),
    goal_id: str | None = Form(None),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[KnowledgeDocumentResponse]:
    try:
        document = await knowledge_service.upload_document(
            db,
            current_user.id,
            file,
            goal_id=uuid.UUID(goal_id) if goal_id else None,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

    return ok(KnowledgeDocumentResponse.model_validate(document), code=201)


@router.get(
    "/documents",
    response_model=StandardResponse[list[KnowledgeDocumentResponse]],
)
async def list_documents(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[list[KnowledgeDocumentResponse]]:
    documents = await knowledge_service.list_documents(db, current_user.id)
    response = [
        KnowledgeDocumentResponse.model_validate(document) for document in documents
    ]
    return ok(data=response)

@router.get(
    "/documents/by-goal/{goal_id}",
    response_model=StandardResponse[list[KnowledgeDocumentResponse]],
)
async def list_documents_by_goal(
    goal_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[list[KnowledgeDocumentResponse]]:
    documents = await knowledge_service.list_documents_by_goal(
        db, current_user.id, uuid.UUID(goal_id)
    )
    response = [KnowledgeDocumentResponse.model_validate(d) for d in documents]
    return ok(data=response)


@router.get(
    "/documents/unassigned",
    response_model=StandardResponse[list[KnowledgeDocumentResponse]],
)
async def list_documents_unassigned(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[list[KnowledgeDocumentResponse]]:
    documents = await knowledge_service.list_documents_unassigned(db, current_user.id)
    response = [KnowledgeDocumentResponse.model_validate(d) for d in documents]
    return ok(data=response)


@router.get(
    "/documents/{document_id}/file",
    response_class=FileResponse,
)
async def download_document(
    document_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    path = await knowledge_service.ensure_document_path(
        db, current_user.id, uuid.UUID(document_id)
    )
    return FileResponse(path, filename=path.name)

@router.patch(
    "/documents/{document_id}/goal",
    response_model=StandardResponse[KnowledgeDocumentResponse],
)
async def update_document_goal(
    document_id: str,
    payload: KnowledgeDocumentGoalUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[KnowledgeDocumentResponse]:
    document = await knowledge_service.update_document_goal(
        db,
        current_user.id,
        uuid.UUID(document_id),
        payload.goal_id,
    )
    return ok(KnowledgeDocumentResponse.model_validate(document))

@router.delete(
    "/documents/{document_id}",
    response_model=StandardResponse[None],
)
async def delete_document(
    document_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[None]:
    try:
        await knowledge_service.delete_document(db, current_user.id, uuid.UUID(document_id))
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

    return ok(None)


@router.post(
    "/query",
    response_model=StandardResponse[KnowledgeQueryResponse],
)
async def query_knowledge(
    payload: KnowledgeQueryRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[KnowledgeQueryResponse]:
    try:
        results = await knowledge_service.search(
            db=db,
            user_id=current_user.id,
            query=payload.question,
            top_k=payload.top_k,
            document_ids=payload.document_ids if payload.document_ids else None,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

    contexts = [
        KnowledgeContext(
            document_id=chunk.document_id,
            chunk_index=chunk.chunk_index,
            content=chunk.content[: settings.KNOWLEDGE_CONTEXT_PREVIEW_CHARS],
            score=float(score),
            stored_filename=document.stored_filename,
            original_filename=document.original_filename,
        )
        for chunk, document, score in results
    ]

    return ok(KnowledgeQueryResponse(contexts=contexts))


@router.post(
    "/conversation/stream",
    response_class=StreamingResponse,
    description=(
        "Server-Sent Events stream. Events: context, meta, delta, done, error. "
        "Each event uses 'data: <json>'."
    ),
    responses={
        200: {
            "content": {
                "text/event-stream": {
                    "example": (
                        "event: context\n"
                        "data: {\"contexts\":[{\"document_id\":\"00000000-0000-0000-0000-000000000000\",\"chunk_index\":0,"
                        "\"content\":\"...\",\"score\":0.12,\"stored_filename\":\"file.pdf\",\"original_filename\":\"file.pdf\"}]}\n\n"
                        "event: meta\n"
                        "data: {\"conversation_id\":\"abc123\"}\n\n"
                        "event: delta\n"
                        "data: {\"text\":\"Hello\"}\n\n"
                        "event: delta\n"
                        "data: {\"text\":\" world\"}\n\n"
                        "event: done\n"
                        "data: {\"ok\":true}\n\n"
                    )
                }
            }
        }
    },
)
async def conversation_stream(
    payload: KnowledgeConversationRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return StreamingResponse(
        knowledge_service.conversation_sse(
            db=db,
            user_id=current_user.id,
            question=payload.question,
            top_k=payload.top_k,
            document_ids=payload.document_ids if payload.document_ids else None,
            conversation_id=payload.conversation_id,
            max_context_chars=payload.max_context_chars,
        ),
        media_type="text/event-stream",
    )
