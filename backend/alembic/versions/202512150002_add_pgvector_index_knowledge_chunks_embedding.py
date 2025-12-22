"""add pgvector index for knowledge chunk embedding

Revision ID: 202512150002
Revises: 202512150001
Create Date: 2025-12-15 00:00:00
"""

from __future__ import annotations

from alembic import op


revision = "202512150002"
down_revision = "202512150001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # IVF_FLAT is widely supported and good enough for a first pass.
    # Note: building this index can take time on large tables.
    # Tune "lists" based on row count (e.g. sqrt(n) roughly).
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_embedding_ivfflat_cosine
        ON knowledge_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_knowledge_chunks_embedding_ivfflat_cosine;")


