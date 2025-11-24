from fastapi import APIRouter, HTTPException, status

from app.schemas.user import UserLogin, UserResponse, UserCreate, TokenResponse
from app.core.db import get_db, AsyncSession
from fastapi import Depends
from app.services.user_service import UserService
from app.core.security import create_access_token
from app.schemas.common import StandardResponse, ok
from app.core.config import settings
from datetime import timedelta
from app.api.v1.deps import get_current_user
from app.models.user import User

router = APIRouter()
user_service = UserService()


@router.post("/login", response_model=StandardResponse[TokenResponse])
async def login(user_data: UserLogin, db: AsyncSession=Depends(get_db)) -> StandardResponse[TokenResponse | None]:

    user = await user_service.user_login(db, user_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, 
        expires_delta=access_token_expires,
    )

    return ok(
        TokenResponse(
            access_token=access_token,
            expires_in=int(access_token_expires.total_seconds()),
        )
    )


@router.post("/register", response_model=StandardResponse[UserResponse])
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)) -> StandardResponse[UserResponse | None]:
    try:
        new_user = await user_service.create_user(db, user_data)
        return ok(UserResponse.model_validate(new_user))
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    

@router.get("/me", response_model=StandardResponse[UserResponse])
async def get_user_info(current_user: User = Depends(get_current_user)) -> StandardResponse[UserResponse | None]:
    return ok(UserResponse.model_validate(current_user))