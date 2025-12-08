from __future__ import annotations

from typing import Sequence, cast, Any

from google import genai
from google.genai import types
import numpy as np

from app.core.config import settings


class EmbeddingService:
    """Wrapper around Google Gemini embedding endpoint (google-genai)."""

    def __init__(self) -> None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not configured for embedding generation")
        
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model = settings.EMBEDDING_MODEL_NAME

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """
        Generates embeddings for a list of texts using native async and batching.
        The Gemini Embed API limits batch size to 100; we chunk requests to stay under the cap.
        """
        if not texts:
            return []

        batch_size = 100
        raw_embeddings: list[list[float]] = []

        try:
            for start in range(0, len(texts), batch_size):
                batch = list(texts[start : start + batch_size])
                response = await self.client.aio.models.embed_content(
                    model=self.model,
                    contents=cast(list[Any], batch),
                    config=types.EmbedContentConfig(output_dimensionality=settings.EMBEDDING_DIM),
                )

                if not response.embeddings:
                    raise RuntimeError("Gemini API returned empty embeddings")

                for i, emb in enumerate(response.embeddings):
                    if emb.values is None:
                        raise RuntimeError(
                            f"Gemini API returned empty embedding for index {start + i}"
                        )
                    raw_embeddings.append(emb.values)

            mat = np.array(raw_embeddings)  # Shape: (N, 768)
            norms = np.linalg.norm(mat, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            normed_mat = mat / norms

            return normed_mat.tolist()

        except Exception as e:
            raise RuntimeError(f"Failed to generate embeddings: {e}") from e