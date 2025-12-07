from __future__ import annotations

import re
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.breakdown import BreakdownItem


class DifyAIService:
    """
    Minimal client for Dify chat-messages endpoint to get task breakdowns.
    """

    def __init__(self) -> None:
        self.api_base = settings.DIFY_API_BASE.rstrip("/") if settings.DIFY_API_BASE else None
        self.api_key = settings.DIFY_API_KEY

    def _get_headers(self) -> dict[str, str]:
        if not self.api_key:
            msg = "DIFY_API_KEY is not configured"
            raise RuntimeError(msg)
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def breakdown_text(
        self,
        text: str,
        model: str | None = None,
        user_id: str | None = None,
        extra: dict[str, Any] | None = None,
    ) -> list[BreakdownItem]:
        """
        Send the text to Dify and parse the response into structured items.
        """
        if not self.api_base:
            msg = "DIFY_API_BASE is not configured"
            raise RuntimeError(msg)

        payload: dict[str, Any] = {
            "query": text,
            "inputs": {},
            "response_mode": "blocking",
            "user": user_id or "system",
        }
        if model:
            payload["model"] = model
        if extra:
            payload.update(extra)

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self.api_base}/chat-messages",
                json=payload,
                headers=self._get_headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        raw_answer = data.get("answer") or ""
        return self._parse_breakdown_text(raw_answer)

    def _parse_breakdown_text(self, raw: str) -> list[BreakdownItem]:
        """
        Convert AI free-form response into ordered items.
        """
        lines = raw.replace("\r", "").split("\n")
        items: list[BreakdownItem] = []
        order = 1
        for line in lines:
            cleaned = line.strip()
            if not cleaned:
                continue
            # Strip common prefixes like "1.", "1)", "- ", "• "
            cleaned = re.sub(r"^[\-\•\*\s]*", "", cleaned)
            cleaned = re.sub(r"^\d+[\.\:\)\-]\s*", "", cleaned)
            if cleaned:
                items.append(BreakdownItem(order=order, text=cleaned))
                order += 1
        return items
