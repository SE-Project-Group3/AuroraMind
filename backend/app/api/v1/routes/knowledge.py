from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
import uuid

from app.api.v1.deps import get_current_user
from app.core.db import AsyncSession, get_db
from app.schemas.common import StandardResponse, ok
from app.schemas.knowledge import (
    KnowledgeContext,
    KnowledgeDocumentResponse,
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
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[KnowledgeDocumentResponse]:
    try:
        document = await knowledge_service.upload_document(db, current_user.id, file)
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
            document_id=payload.document_id,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

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
    chunk_entities = [item[0] for item in results]
    try:
        answer = await knowledge_service.answer_with_dify(
            question=payload.question, contexts=chunk_entities
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc

    return ok(KnowledgeQueryResponse(answer=answer, contexts=contexts))

