from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import BaseModel


class User(BaseModel):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, comment="username"
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False, comment="hashed password"
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, comment="email"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, comment="user is active"
    )

    def __repr__(self) -> str:
        return f"<User {self.id}>, username={self.username}"