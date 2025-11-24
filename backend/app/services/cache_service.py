from app.core.cache import get_redis_client
from app.schemas.user import UserResponse


class CacheService:
    def __init__(self, ttl: int = 300):
        self.cache = get_redis_client()
        self.ttl = ttl

    async def get_user(self, username: str) -> UserResponse | None:
        data = await self.cache.get(f"user:{username}")
        if not data:
            return None
        return UserResponse.model_validate_json(data)

    async def set_user(self, user: UserResponse) -> None:
        await self.cache.set(f"user:{user.username}", user.model_dump_json(), ex=self.ttl)

    async def delete_user(self, username: str) -> None:
        await self.cache.delete(f"user:{username}")