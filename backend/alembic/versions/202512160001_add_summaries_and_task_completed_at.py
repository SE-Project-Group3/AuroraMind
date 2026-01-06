"""add summaries table and task completed_at

Revision ID: 202512160001
Revises: 202512150004
Create Date: 2025-12-16 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202512160001"
down_revision = "202512150004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "summaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("summary_type", sa.String(length=20), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_message", sa.String(length=2000), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_summaries_user_id"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "summary_type",
            "period_start",
            name="uq_summaries_user_type_start",
        ),
    )
    op.create_index("ix_summaries_user_id", "summaries", ["user_id"])
    op.create_index(
        "ix_summaries_type_start",
        "summaries",
        ["summary_type", "period_start"],
    )


def downgrade() -> None:
    op.drop_index("ix_summaries_type_start", table_name="summaries")
    op.drop_index("ix_summaries_user_id", table_name="summaries")
    op.drop_table("summaries")
    op.drop_column("tasks", "completed_at")
