"""remove description column from phases

Revision ID: 202412020001
Revises: 202411300300
Create Date: 2025-12-02 00:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202412020001"
down_revision = "202411300300"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("phases", "description")


def downgrade() -> None:
    op.add_column(
        "phases",
        sa.Column("description", sa.String(length=1024), nullable=True),
    )
