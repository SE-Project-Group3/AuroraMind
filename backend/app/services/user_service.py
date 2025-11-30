from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.sql import Select

from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserUpdate, UserResponse
from app.core.security import get_hashed_password, verify_password
from app.services.cache_service import CacheService

cache_service = CacheService()

class UserService:

    async def create_user(self, db: AsyncSession, user_data: UserCreate) -> User:
       try:
           existing_user = await self.get_user_by_username(db, user_data.username)
           if existing_user:
               raise ValueError("Username already exists")
           
           existing_email = await self.get_user_by_email(db,user_data.email)
           if existing_email:
               raise ValueError("Email already exists")
           
           hashed_password = get_hashed_password(user_data.password)
           new_user = User(
               username=user_data.username,
               email=user_data.email,
               hashed_password=hashed_password,
               is_active=True,
           )

           db.add(new_user)
           await db.commit()
           await db.refresh(new_user)
           await cache_service.set_user(UserResponse.model_validate(new_user))
           return new_user
       except Exception as e:
           await db.rollback()
           raise e
        

    async def get_user_by_id(self, db: AsyncSession, user_id: str) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(
            and_(
                User.id == user_id,
                User.is_active.is_(True),
                User.is_deleted.is_(False),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()


    async def get_user_by_username(self, db: AsyncSession, username: str) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(
            and_(
                User.username == username,
                User.is_active.is_(True),
                User.is_deleted.is_(False),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_profile(self, db: AsyncSession, username: str) -> UserResponse | None:
        cached = await cache_service.get_user(username)
        if cached:
            return cached
        user = await self.get_user_by_username(db, username)
        if not user:
            return None
        profile = UserResponse.model_validate(user)
        await cache_service.set_user(profile)
        return profile


    async def get_user_by_email(self, db: AsyncSession, email: str) -> User | None:
        stmt: Select[tuple[User]] = select(User).where(
            and_(
                User.email == email,
                User.is_active.is_(True),
                User.is_deleted.is_(False),
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    

    async def user_login(self, db: AsyncSession, user_data: UserLogin) -> User | None:
        user = await self.get_user_by_username(db, user_data.username)
        if not user:
            return None
        
        if not verify_password(user_data.password, str(user.hashed_password)):
            return None
        
        if not bool(user.is_active):
            return None

        await cache_service.set_user(UserResponse.model_validate(user))
        return user
    

    async def update_user(self, db: AsyncSession, user_id: str, user_data: UserUpdate) -> User | None:
        try:
            user = await self.get_user_by_id(db, user_id)
            if not user:
                return None
            
            if user_data.username:
                existing_user = await self.get_user_by_username(db, user_data.username)
                if existing_user and bool(existing_user.id != user.id):
                    raise ValueError("Username already exists")
                user.username = user_data.username
            
            if user_data.email:
                existing_email = await self.get_user_by_email(db, user_data.email)
                if existing_email and bool(existing_email.id != user.id):
                    raise ValueError("Email already exists")
                user.email = user_data.email
            
            if user_data.is_active is not None:
                    user.is_active = user_data.is_active
            
            if user_data.password:
                user.hashed_password = get_hashed_password(user_data.password)

            await db.commit()
            await db.refresh(user)
            await cache_service.set_user(UserResponse.model_validate(user))
            return user
        except Exception as e:
            await db.rollback()
            raise e

        
    async def delete_user(self, db: AsyncSession, user_id: str) -> bool:
        try:
            user = await self.get_user_by_id(db, user_id)
            if not user:
                return False
            
            user.soft_delete()
            await db.commit()
            await cache_service.delete_user(user.username)
            return True
        except Exception as e:
            await db.rollback()
            raise e