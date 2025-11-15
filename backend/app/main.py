from fastapi import FastAPI

from .api.v1.main import api_router
from .core.config import settings

app = FastAPI(
    title="AuroraMind",
    description="An AI Personal Growth Platform",
    version="0.1.0",
)

app.include_router(api_router, prefix=settings.API_V1_STR)
