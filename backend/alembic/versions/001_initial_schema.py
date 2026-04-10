"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-02-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'ACTIVE', 'SUSPENDED', 'DENIED', name='userstatus'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'])

    # Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('ix_roles_id', 'roles', ['id'])

    # Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('ix_permissions_id', 'permissions', ['id'])

    # Create access_requests table
    op.create_table(
        'access_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'ACTIVE', 'SUSPENDED', 'DENIED', name='userstatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_access_requests_id', 'access_requests', ['id'])
    op.create_index('ix_access_requests_email', 'access_requests', ['email'])

    # Create user_roles table
    op.create_table(
        'user_roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.Column('assigned_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_user_role', 'user_roles', ['user_id', 'role_id'], unique=True)

    # Create role_permissions table
    op.create_table(
        'role_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_role_permission', 'role_permissions', ['role_id', 'permission_id'], unique=True)

    # Create documents table
    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_path', sa.String(500), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('classification', sa.Enum('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', name='classificationlevel'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('checksum', sa.String(64), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_documents_id', 'documents', ['id'])

    # Create document_chunks table
    op.create_table(
        'document_chunks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('chunk_id', sa.String(100), nullable=False),
        sa.Column('content_encrypted', sa.Text(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('chunk_id'),
    )
    op.create_index('ix_document_chunks_chunk_id', 'document_chunks', ['chunk_id'])
    op.create_index('idx_doc_chunk', 'document_chunks', ['document_id', 'chunk_index'])

    # Create document_acl table
    op.create_table(
        'document_acl',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_doc_acl_role', 'document_acl', ['document_id', 'role_id'])
    op.create_index('idx_doc_acl_user', 'document_acl', ['document_id', 'user_id'])

    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('request_id', sa.String(100), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=True),
        sa.Column('resource_id', sa.String(100), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('outcome', sa.String(20), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('metadata', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_logs_id', 'audit_logs', ['id'])
    op.create_index('ix_audit_logs_request_id', 'audit_logs', ['request_id'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('idx_audit_composite', 'audit_logs', ['user_id', 'action', 'created_at'])

    # Create revoked_tokens table
    op.create_table(
        'revoked_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('jti', sa.String(100), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('jti'),
    )
    op.create_index('ix_revoked_tokens_jti', 'revoked_tokens', ['jti'])
    op.create_index('idx_revoked_expires', 'revoked_tokens', ['expires_at'])


def downgrade() -> None:
    op.drop_table('revoked_tokens')
    op.drop_table('audit_logs')
    op.drop_table('document_acl')
    op.drop_table('document_chunks')
    op.drop_table('documents')
    op.drop_table('role_permissions')
    op.drop_table('user_roles')
    op.drop_table('access_requests')
    op.drop_table('permissions')
    op.drop_table('roles')
    op.drop_table('users')
