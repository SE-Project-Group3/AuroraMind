from fastapi import APIRouter

from .routes import auth, health, task_lists, tasks, user

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(task_lists.router)
api_router.include_router(tasks.router)