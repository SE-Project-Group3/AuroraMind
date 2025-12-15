"""merge heads 202412150001 and 202512150003

Revision ID: 202512150004
Revises: 202412150001, 202512150003
Create Date: 2025-12-15 00:00:00
"""

from __future__ import annotations


revision = "202512150004"
down_revision = ("202412150001", "202512150003")
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a merge migration (no schema changes).
    pass


def downgrade() -> None:
    # Downgrading past a merge is handled by Alembic traversing each branch.
    pass


