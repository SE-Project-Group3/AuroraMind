from typing import AsyncGenerator, Generator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from .config import settings

async_engine = create_async_engine(
    str(settings.SQLALCHEMY_DATABASE_URI),
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_recycle=3600,
)

sync_engine = create_engine(
    str(settings.SQLALCHEMY_SYNC_DATABASE_URI),
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_recycle=3600,
)

Async_session = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Sync_session = sessionmaker(
    sync_engine,
    class_=Session,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with Async_session() as session:
        try:
            yield session
        except Exception as e:
            try:
                if isinstance(e, SQLAlchemyError):
                    await session.rollback()
            finally:
                raise e
        finally:
            await session.close()


def get_sync_db() -> Generator[Session, None, None]:
    db = Sync_session()
    try:
        yield db
    except Exception as e:
        db.rollback()   
        raise e
    finally:
        db.close()