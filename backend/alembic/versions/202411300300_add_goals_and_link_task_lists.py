"""add goals table and link task lists

Revision ID: 202411300300
Revises: 202411300200
Create Date: 2025-12-01 00:00:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202411300300"
down_revision = "202411300200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "goals",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1024), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_goals_user_id"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_goals_user_id", "goals", ["user_id"])

    op.add_column(
        "task_lists",
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_task_lists_goal_id",
        source_table="task_lists",
        referent_table="goals",
        local_cols=["goal_id"],
        remote_cols=["id"],
    )
    op.create_index("ix_task_lists_goal_id", "task_lists", ["goal_id"])

    op.create_table(
        "phases",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1024), nullable=True),
        sa.Column("goal_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["goal_id"], ["goals.id"], name="fk_phases_goal_id"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_phases_goal_id", "phases", ["goal_id"])

    op.create_table(
        "phase_tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("phase_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["phase_id"], ["phases.id"], name="fk_phase_tasks_phase_id"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_phase_tasks_phase_id", "phase_tasks", ["phase_id"])


def downgrade() -> None:
    op.drop_index("ix_phase_tasks_phase_id", table_name="phase_tasks")
    op.drop_table("phase_tasks")
    op.drop_index("ix_phases_goal_id", table_name="phases")
    op.drop_table("phases")
    op.drop_index("ix_task_lists_goal_id", table_name="task_lists")
    op.drop_constraint("fk_task_lists_goal_id", "task_lists", type_="foreignkey")
    op.drop_column("task_lists", "goal_id")

    op.drop_index("ix_goals_user_id", table_name="goals")
    op.drop_table("goals")
