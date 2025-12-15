from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status

from app.core.db import get_db, AsyncSession
from app.core.security import verify_token
from app.schemas.user import UserResponse
from app.services.user_service import UserService

security = HTTPBearer()
user_service = UserService()


async def get_current_user(
        credentials: HTTPAuthorizationCredentials=Depends(security),
        db: AsyncSession=Depends(get_db),
) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise credentials_exception
        
    username = payload.get("sub")
    if not username:
        raise credentials_exception
        


    user = await user_service.get_user_profile(db, username)
    if not user:
        raise credentials_exception
        
    return user
