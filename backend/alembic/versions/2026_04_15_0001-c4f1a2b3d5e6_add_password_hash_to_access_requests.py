"""add_password_hash_to_access_requests

Revision ID: c4f1a2b3d5e6
Revises: b3eb42adbe57
Create Date: 2026-04-15 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'c4f1a2b3d5e6'
down_revision = 'b3eb42adbe57'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'access_requests',
        sa.Column('password_hash', sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('access_requests', 'password_hash')
