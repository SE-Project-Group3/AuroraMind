from fastapi import APIRouter, HTTPException, status
from fastapi import Depends

from app.api.v1.deps import get_current_user
from app.core.db import AsyncSession, get_db
from app.schemas.common import StandardResponse, ok
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/me")
user_service = UserService()


@router.get("/info", response_model=StandardResponse[UserResponse])
async def get_user_info(current_user: UserResponse = Depends(get_current_user)) -> StandardResponse[UserResponse | None]:
    return ok(current_user)


@router.post("/update", response_model=StandardResponse[UserResponse])
async def update_user_info(user_data: UserUpdate, current_user: UserResponse = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> StandardResponse[UserResponse | None]:
    user = await user_service.update_user(db, str(current_user.id), user_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update user information",
        )
    return ok(UserResponse.model_validate(user))