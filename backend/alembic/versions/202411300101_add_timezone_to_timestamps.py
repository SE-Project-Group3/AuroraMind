"""make timestamp columns timezone-aware

Revision ID: 202411300101
Revises: 202411231200
Create Date: 2025-11-30 00:00:00
"""
from __future__ import annotations

from typing import Final

from alembic import op
import sqlalchemy as sa
from sqlalchemy import TIMESTAMP, inspect


revision = "202411300101"
down_revision = "202411231200"
branch_labels = None
depends_on = None


TABLE_NAME: Final = "users"
TIMESTAMP_COLUMNS: Final = ("created_at", "updated_at")


def _column_has_timezone(column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    for column in inspector.get_columns(TABLE_NAME):
        if column["name"] == column_name:
            return bool(getattr(column["type"], "timezone", False))
    return False


def upgrade() -> None:
    for column in TIMESTAMP_COLUMNS:
        if _column_has_timezone(column):
            continue
        op.alter_column(
            TABLE_NAME,
            column,
            type_=TIMESTAMP(timezone=True),
            existing_type=TIMESTAMP(timezone=False),
            nullable=False,
            postgresql_using=f"{column} AT TIME ZONE 'UTC'",
        )


def downgrade() -> None:
    for column in TIMESTAMP_COLUMNS:
        if not _column_has_timezone(column):
            continue
        op.alter_column(
            TABLE_NAME,
            column,
            type_=TIMESTAMP(timezone=False),
            existing_type=TIMESTAMP(timezone=True),
            nullable=False,
            postgresql_using=f"{column} AT TIME ZONE 'UTC'",
        )


