from pydantic import BaseModel, EmailStr
from datetime import datetime

import uuid

class UserBase(BaseModel):
    username: str
    email: EmailStr
    

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase): 
    password: str | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int