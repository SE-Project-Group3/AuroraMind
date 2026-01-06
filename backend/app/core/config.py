from typing import Any, Annotated

from pydantic import (
    AnyUrl,
    PostgresDsn,
    computed_field,
    BeforeValidator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, list | str):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AuroraMind"
    DEBUG: bool = False

    FRONTEND_HOST: str = "http://localhost:5173"
    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = []

    @computed_field # type: ignore[prop-decorator]
    @property
    def all_cors_origins(self) -> list[str]:
        return [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS] + [
                self.FRONTEND_HOST
        ]
    
    POSTGRES_SERVER: str
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = ""

    @computed_field # type: ignore[prop-decorator]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )
    
    @computed_field # type: ignore[prop-decorator]
    @property
    def SQLALCHEMY_SYNC_DATABASE_URI(self) -> PostgresDsn:
        return PostgresDsn.build(
            scheme="postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    JWT_SECRET_KEY: str
    ALGORITHM: str = "HS256"

    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0

    # Celery (defaults to Redis derived from REDIS_* if not set explicitly)
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None
    # External AI (Dify/Gemini)
    
    KNOWLEDGE_STORAGE_ROOT: str = "data"
    # Embeddings (local HF)
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
    # Keep 768 to match existing pgvector schema/migration by default.
    EMBEDDING_DIM: int = 768
    # Local HF embedding options
    HF_EMBEDDING_DEVICE: str = "cpu"  # "cpu" | "cuda" | "mps"
    HF_EMBEDDING_BATCH_SIZE: int = 32

    # Knowledge chunking (tuned for RAG QA; units are characters, not tokens)
    KNOWLEDGE_CHUNK_SIZE: int = 700
    KNOWLEDGE_CHUNK_OVERLAP: int = 120
    # What we send back to frontend as "context preview" (avoid huge UI payloads)
    KNOWLEDGE_CONTEXT_PREVIEW_CHARS: int = 400
    # Retrieval gating: if best distance is worse than this, skip context.
    # Set to None to disable gating.
    KNOWLEDGE_MAX_DISTANCE: float | None = 0.5

    # Dify (LLM QA)
    DIFY_API_BASE: str = "https://api.dify.ai/v1"
    DIFY_BR_API_KEY: str | None = None
    DIFY_KB_API_KEY: str | None = None
    DIFY_SUMMARY_API_KEY: str | None = None

    SUMMARY_AUTOGEN_ENABLED: bool = True
    SUMMARY_AUTOGEN_HOUR_UTC: int = 23
    SUMMARY_AUTOGEN_MINUTE_UTC: int = 55
    
settings = Settings()  # type: ignore[assignment]
