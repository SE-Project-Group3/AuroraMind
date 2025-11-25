from redis import asyncio as aioredis

from .config import settings

redis_client = aioredis.from_url(
    f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    password=settings.REDIS_PASSWORD,
    decode_responses=True,
)


def get_redis_client() -> aioredis.Redis:
    return redis_client