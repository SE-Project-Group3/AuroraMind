"""add summary period label fields

Revision ID: 202512160002
Revises: 202512160001
Create Date: 2025-12-16 00:10:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202512160002"
down_revision = "202512160001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "summaries",
        sa.Column("period_label", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "summaries",
        sa.Column("period_year", sa.Integer(), nullable=True),
    )
    op.add_column(
        "summaries",
        sa.Column("period_week", sa.Integer(), nullable=True),
    )
    op.add_column(
        "summaries",
        sa.Column("period_month", sa.Integer(), nullable=True),
    )

    op.execute(
        """
        UPDATE summaries
        SET period_label = TO_CHAR(period_start, 'YYYY-MM'),
            period_year = EXTRACT(YEAR FROM period_start)::int,
            period_month = EXTRACT(MONTH FROM period_start)::int
        WHERE summary_type = 'monthly';
        """
    )
    op.execute(
        """
        UPDATE summaries
        SET period_label = TO_CHAR(period_start, 'IYYY-"W"IW'),
            period_year = EXTRACT(ISOYEAR FROM period_start)::int,
            period_week = EXTRACT(WEEK FROM period_start)::int
        WHERE summary_type = 'weekly';
        """
    )

    op.alter_column("summaries", "period_label", nullable=False)
    op.alter_column("summaries", "period_year", nullable=False)


def downgrade() -> None:
    op.drop_column("summaries", "period_month")
    op.drop_column("summaries", "period_week")
    op.drop_column("summaries", "period_year")
    op.drop_column("summaries", "period_label")
