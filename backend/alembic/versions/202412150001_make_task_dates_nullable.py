"""make task dates nullable

Revision ID: 202412150001
Revises: 202412020001
Create Date: 2025-12-15 20:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "202412150001"
down_revision = "202412020001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "tasks",
        "start_date",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
    )
    op.alter_column(
        "tasks",
        "end_date",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "tasks",
        "end_date",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
    op.alter_column(
        "tasks",
        "start_date",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
