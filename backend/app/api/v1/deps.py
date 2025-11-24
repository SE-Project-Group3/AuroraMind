from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status

from app.core.db import get_db, AsyncSession
from app.core.security import verify_token
from app.models.user import User
from sqlalchemy import select, and_

security = HTTPBearer()


async def get_current_user(
        credentials: HTTPAuthorizationCredentials=Depends(security),
        db: AsyncSession=Depends(get_db),
) -> User:
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
        


    result = await db .execute(
        select(User).where(
            and_(
                User.username == username,
                User.is_active.is_(True),
                User.is_deleted.is_(False),
            )
        )
    )

    user = result.scalar_one_or_none()

    if not user:
        raise credentials_exception
        
    return user
