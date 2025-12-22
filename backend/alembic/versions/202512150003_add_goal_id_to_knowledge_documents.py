"""add goal_id to knowledge_documents

Revision ID: 202512150003
Revises: 202512150002
Create Date: 2025-12-15 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202512150003"
down_revision = "202512150002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "knowledge_documents",
        sa.Column(
            "goal_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
            comment="optional related goal id",
        ),
    )
    op.create_foreign_key(
        "fk_knowledge_documents_goal_id",
        "knowledge_documents",
        "goals",
        ["goal_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_knowledge_documents_goal_id",
        "knowledge_documents",
        ["goal_id"],
    )
    op.create_index(
        "ix_knowledge_documents_user_id_goal_id",
        "knowledge_documents",
        ["user_id", "goal_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_knowledge_documents_user_id_goal_id", table_name="knowledge_documents")
    op.drop_index("ix_knowledge_documents_goal_id", table_name="knowledge_documents")
    op.drop_constraint("fk_knowledge_documents_goal_id", "knowledge_documents", type_="foreignkey")
    op.drop_column("knowledge_documents", "goal_id")


