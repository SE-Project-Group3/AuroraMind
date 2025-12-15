from __future__ import annotations

import re
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.breakdown import BreakdownItem


class DifyAIService:
    """
    Minimal client for Dify workflow/chat endpoint to get task breakdowns.
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
        Send the text to Dify workflow and parse the response into structured items.
        Expects the workflow output field to be named 'text'.
        """
        if not self.api_base:
            msg = "DIFY_API_BASE is not configured"
            raise RuntimeError(msg)

        inputs: dict[str, Any] = {"description": text}
        if model:
            inputs["model"] = model
        if extra:
            inputs.update(extra)

        payload: dict[str, Any] = {
            "inputs": inputs,
            "response_mode": "blocking",
            "user": user_id or "system",
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self.api_base}/workflows/run",
                json=payload,
                headers=self._get_headers(),
            )
            resp.raise_for_status()
            data = resp.json()

        raw_answer = data.get("data", {}).get("outputs", {}).get("text") or ""
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
            cleaned = cleaned.strip("[]")  # remove surrounding brackets if present
            if cleaned:
                items.append(BreakdownItem(order=order, text=cleaned))
                order += 1

        # If the first line is a summary, make it order 0 and renumber the rest from 1
        if items and items[0].text.lower().startswith("summary"):
            items[0].order = 0
            for idx, item in enumerate(items[1:], start=1):
                item.order = idx
        return items
