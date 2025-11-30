"""create task list and task tables

Revision ID: 202411300200
Revises: 202411300101
Create Date: 2025-11-30 12:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202411300200"
down_revision = "202411300101"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "task_lists",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_task_lists_user_id"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_task_lists_user_id",
        "task_lists",
        ["user_id"],
    )

    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "is_completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_list_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["task_list_id"], ["task_lists.id"], name="fk_tasks_task_list_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_tasks_user_id"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_user_id", "tasks", ["user_id"])
    op.create_index("ix_tasks_task_list_id", "tasks", ["task_list_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_task_list_id", table_name="tasks")
    op.drop_index("ix_tasks_user_id", table_name="tasks")
    op.drop_table("tasks")
    op.drop_index("ix_task_lists_user_id", table_name="task_lists")
    op.drop_table("task_lists")

