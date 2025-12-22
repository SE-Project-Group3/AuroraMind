from __future__ import annotations

from typing import Sequence, cast
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
    """Local HF SentenceTransformers embeddings."""

    def __init__(self) -> None:
        self.model = settings.EMBEDDING_MODEL_NAME

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """
        Generates L2-normalized embeddings for a list of texts.
        Uses SentenceTransformers locally (runs in a thread to avoid blocking).
        """
        if not texts:
            return []

        try:
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