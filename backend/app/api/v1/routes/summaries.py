from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import get_current_user
from app.core.db import AsyncSession, get_db
from app.schemas.common import StandardResponse, ok
from app.schemas.summary import SummaryGenerateRequest, SummaryResponse, SummaryType
from app.schemas.user import UserResponse
from app.services.summary_service import SummaryService


router = APIRouter(prefix="/summaries", tags=["summaries"])
summary_service = SummaryService()


@router.get(
    "",
    response_model=StandardResponse[list[SummaryResponse]],
)
async def list_summaries(
    summary_type: SummaryType | None = None,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[list[SummaryResponse]]:
    summaries = await summary_service.list_summaries(
        db, current_user.id, summary_type
    )
    response = [SummaryResponse.model_validate(s) for s in summaries]
    return ok(response)


@router.get(
    "/weekly",
    response_model=StandardResponse[list[SummaryResponse]],
)
async def list_weekly_summaries(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[list[SummaryResponse]]:
    summaries = await summary_service.list_summaries(
        db, current_user.id, SummaryType.weekly
    )
    response = [SummaryResponse.model_validate(s) for s in summaries]
    return ok(response)


@router.get(
    "/monthly",
    response_model=StandardResponse[list[SummaryResponse]],
)
async def list_monthly_summaries(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[list[SummaryResponse]]:
    summaries = await summary_service.list_summaries(
        db, current_user.id, SummaryType.monthly
    )
    response = [SummaryResponse.model_validate(s) for s in summaries]
    return ok(response)


@router.post(
    "/generate",
    response_model=StandardResponse[SummaryResponse],
    status_code=status.HTTP_201_CREATED,
)
async def generate_summary(
    payload: SummaryGenerateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StandardResponse[SummaryResponse]:
    if (payload.period_start is None) != (payload.period_end is None):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="period_start and period_end must both be provided or both omitted",
        )

    if payload.period_start and payload.period_end:
        period_start = payload.period_start
        period_end = payload.period_end
    else:
        today = datetime.now(timezone.utc).date()
        period = summary_service.period_range_for_today(payload.summary_type, today)
        period_start = period.start
        period_end = period.end

    try:
        summary = await summary_service.generate_summary(
            db,
            current_user.id,
            payload.summary_type,
            period_start,
            period_end,
            force=payload.force,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
    return ok(SummaryResponse.model_validate(summary), code=201)
