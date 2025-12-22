"""add knowledge ingestion progress fields

Revision ID: 202512150001
Revises: 202412070001
Create Date: 2025-12-15 00:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202512150001"
down_revision = "202412070001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "knowledge_documents",
        sa.Column(
            "ingest_progress",
            sa.Integer(),
            nullable=False,
            server_default="0",
            comment="ingestion progress percent (0-100)",
        ),
    )
    op.add_column(
        "knowledge_documents",
        sa.Column(
            "chunk_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
            comment="total chunks generated for this document",
        ),
    )
    op.add_column(
        "knowledge_documents",
        sa.Column(
            "error_message",
            sa.Text(),
            nullable=True,
            comment="ingestion error (if failed)",
        ),
    )

    # remove server defaults (keep app defaults)
    op.alter_column("knowledge_documents", "ingest_progress", server_default=None)
    op.alter_column("knowledge_documents", "chunk_count", server_default=None)


def downgrade() -> None:
    op.drop_column("knowledge_documents", "error_message")
    op.drop_column("knowledge_documents", "chunk_count")
    op.drop_column("knowledge_documents", "ingest_progress")


