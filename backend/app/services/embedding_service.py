from __future__ import annotations

from typing import Sequence, cast, Any
import asyncio
from functools import lru_cache

import numpy as np

from app.core.config import settings


@lru_cache(maxsize=1)
def _load_sentence_transformer():
    # Lazy import so environments that use Gemini don't need these deps.
    from sentence_transformers import SentenceTransformer  # type: ignore

    model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME, device=settings.HF_EMBEDDING_DEVICE)
    return model


class EmbeddingService:
    """Embedding provider wrapper (Gemini or local HF SentenceTransformers)."""

    def __init__(self) -> None:
        self.provider = (settings.EMBEDDING_PROVIDER or "hf_local").lower().strip()
        self.model = settings.EMBEDDING_MODEL_NAME

        self._gemini_client = None
        if self.provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise RuntimeError("GEMINI_API_KEY is not configured for embedding generation")
            # Local import to keep dependency optional.
            from google import genai  # type: ignore

            self._gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """
        Generates L2-normalized embeddings for a list of texts.
        - provider=gemini: uses native async API and chunks requests under the batch cap
        - provider=hf_local: uses SentenceTransformers locally (runs in a thread to avoid blocking)
        """
        if not texts:
            return []

        try:
            if self.provider == "gemini":
                # Gemini Embed API limits batch size to 100
                from google.genai import types  # type: ignore

                batch_size = 100
                raw_embeddings: list[list[float]] = []
                assert self._gemini_client is not None

                for start in range(0, len(texts), batch_size):
                    batch = list(texts[start : start + batch_size])
                    response = await self._gemini_client.aio.models.embed_content(
                        model=self.model,
                        contents=cast(list[Any], batch),
                        config=types.EmbedContentConfig(
                            output_dimensionality=settings.EMBEDDING_DIM
                        ),
                    )

                    if not response.embeddings:
                        raise RuntimeError("Gemini API returned empty embeddings")

                    for i, emb in enumerate(response.embeddings):
                        if emb.values is None:
                            raise RuntimeError(
                                f"Gemini API returned empty embedding for index {start + i}"
                            )
                        raw_embeddings.append(emb.values)

                mat = np.array(raw_embeddings)
            else:
                # Local HF embeddings (SentenceTransformers)
                model = _load_sentence_transformer()
                batch_size = max(int(settings.HF_EMBEDDING_BATCH_SIZE or 32), 1)

                def _encode() -> np.ndarray:
                    # returns np.ndarray (N, D)
                    return cast(
                        np.ndarray,
                        model.encode(
                            list(texts),
                            batch_size=batch_size,
                            show_progress_bar=False,
                            convert_to_numpy=True,
                            normalize_embeddings=False,
                        ),
                    )

                mat = await asyncio.to_thread(_encode)

            if mat.ndim != 2:
                raise RuntimeError(f"Unexpected embedding shape: {mat.shape!r}")
            if mat.shape[1] != settings.EMBEDDING_DIM:
                raise RuntimeError(
                    f"Embedding dim mismatch: got {mat.shape[1]}, expected {settings.EMBEDDING_DIM}. "
                    f"Check EMBEDDING_MODEL_NAME/EMBEDDING_DIM."
                )

            norms = np.linalg.norm(mat, axis=1, keepdims=True)
            norms[norms == 0] = 1e-10
            normed_mat = mat / norms
            return normed_mat.astype(np.float32).tolist()
        except Exception as e:
            raise RuntimeError(f"Failed to generate embeddings: {e}") from e