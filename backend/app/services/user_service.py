from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserUpdate
from app.core.security import get_hashed_password, verify_password

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
           return new_user
       except Exception as e:
           await db.rollback()
           raise e
        

    async def get_user_by_id(self, db: AsyncSession, user_id: str) -> User | None:
        user = await db.execute(
            select(User).where(
                and_(
                    User.id == user_id,
                    User.is_active == True,
                    User.is_deleted == False,
                )
            )
        )
        return user.scalar_one_or_none()


    async def get_user_by_username(self, db: AsyncSession, username: str) -> User | None:
        user = await db.execute(
            select(User).where(
                and_(
                    User.username == username,
                    User.is_active == True,
                    User.is_deleted == False,
                )
            )
        )
        return user.scalar_one_or_none()


    async def get_user_by_email(self, db: AsyncSession, email: str) -> User | None:
        user = await db.execute(
            select(User).where(
                and_(
                    User.email == email, 
                    User.is_active == True, 
                    User.is_deleted == False,
                )
            )
        )
        return user.scalar_one_or_none()
    

    async def user_login(self, db: AsyncSession, user_data: UserLogin) -> User | None:
        user = await self.get_user_by_username(db, user_data.username)
        if not user:
            return None
        
        if not verify_password(user_data.password, str(user.hashed_password)):
            return None
        
        if not bool(user.is_active):
            return None
        
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
            return True
        except Exception as e:
            await db.rollback()
            raise e