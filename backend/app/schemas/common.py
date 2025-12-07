from typing import Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class StandardResponse(BaseModel, Generic[T]):
    code: int 
    message: str 
    data: T | None = None


def ok(data: T | None = None, message: str = "success", code: int = 200) -> StandardResponse[T]:
    return StandardResponse[T](code=code, message=message, data=data)
