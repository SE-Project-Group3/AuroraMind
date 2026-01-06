from __future__ import annotations

import json
import re
from typing import Any, AsyncIterator

import httpx

from app.core.config import settings
from app.schemas.breakdown import BreakdownItem


class DifyAIService:
    """
    Minimal client for Dify workflow/chat endpoint to get task breakdowns.
    """

    def __init__(self) -> None:
        self.api_base = settings.DIFY_API_BASE.rstrip("/") if settings.DIFY_API_BASE else None
        self.breakdown_api_key = settings.DIFY_BR_API_KEY
        self.knowledgebase_api_key = settings.DIFY_KB_API_KEY
        self.summary_api_key = settings.DIFY_SUMMARY_API_KEY

    def _get_breakdown_headers(self) -> dict[str, str]:
        if not self.breakdown_api_key:
            msg = "DIFY_API_KEY is not configured"
            raise RuntimeError(msg)   
        return {
            "Authorization": f"Bearer {self.breakdown_api_key}",
            "Content-Type": "application/json",
        }   

    def _get_knowledgebase_headers(self) -> dict[str, str]:
        if not self.knowledgebase_api_key:
            msg = "DIFY_KB_API_KEY is not configured"
            raise RuntimeError(msg)
        return {
            "Authorization": f"Bearer {self.knowledgebase_api_key}",
            "Content-Type": "application/json",
        }

    def _get_summary_headers(self) -> dict[str, str]:
        if not self.summary_api_key:
            msg = "DIFY_SUMMARY_API_KEY is not configured"
            raise RuntimeError(msg)
        return {
            "Authorization": f"Bearer {self.summary_api_key}",
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
                headers=self._get_breakdown_headers(),
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

    async def stream_knowledgebase_chat(
        self,
        *,
        query: str,
        user_id: str,
        conversation_id: str | None = None,
        inputs: dict[str, Any] | None = None,
        timeout_s: float = 60,
    ) -> AsyncIterator[dict[str, Any]]:
        """
        Call Dify knowledge base chat with response_mode="streaming".

        Full URL: f"{self.api_base}/chat-messages"

        Yields events:
        - {"type": "meta", "conversation_id": "..."}
        - {"type": "delta", "text": "..."}
        """
        if not self.api_base:
            msg = "DIFY_API_BASE is not configured"
            raise RuntimeError(msg)

        payload: dict[str, Any] = {
            "inputs": inputs or {},
            "query": query,
            "response_mode": "streaming",
            "user": user_id,
            "conversation_id": conversation_id,
        }

        last_answer = ""
        sent_conversation_id: str | None = None

        if conversation_id:
            sent_conversation_id = conversation_id
            yield {"type": "meta", "conversation_id": conversation_id}

        async with httpx.AsyncClient(timeout=timeout_s) as client:
            async with client.stream(
                "POST",
                f"{self.api_base}/chat-messages",
                json=payload,
                headers=self._get_knowledgebase_headers(),
            ) as resp:
                if resp.status_code >= 400:
                    body = await resp.aread()
                    raise RuntimeError(
                        f"Dify KB call failed: {resp.status_code} {body.decode('utf-8', errors='ignore')}"
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

    async def summary_text(
        self,
        text: str,
        user_id: str | None = None,
        inputs: dict[str, Any] | None = None,
        timeout_s: float = 60,
    ) -> str:
        """
        Call Dify summary workflow with blocking response.
        """
        if not self.api_base:
            msg = "DIFY_API_BASE is not configured"
            raise RuntimeError(msg)

        payload: dict[str, Any] = {
            "inputs": {"description": text, **(inputs or {})},
            "query": text,
            "response_mode": "blocking",
            "user": user_id or "system",
        }

        async with httpx.AsyncClient(timeout=timeout_s) as client:
            resp = await client.post(
                f"{self.api_base}/workflows/run",
                json=payload,
                headers=self._get_summary_headers(),
            )
            if resp.status_code >= 400:
                body = resp.text
                raise RuntimeError(
                    f"Dify summary call failed: {resp.status_code} {body}"
                )
            data = resp.json()

        outputs = data.get("data", {}).get("outputs", {})
        if isinstance(outputs, dict):
            text_output = outputs.get("text")
            if isinstance(text_output, str):
                return text_output.strip()
        raise RuntimeError("Empty summary response from Dify")
