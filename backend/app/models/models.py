from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Enum as SQLEnum, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class UserStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DENIED = "DENIED"


class ClassificationLevel(str, enum.Enum):
    PUBLIC = "PUBLIC"
    INTERNAL = "INTERNAL"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"


class QueryStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    department = Column(String(100))
    password_hash = Column(String(255), nullable=False)
    status = Column(SQLEnum(UserStatus), default=UserStatus.PENDING, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    
    # Relationships
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan", foreign_keys="UserRole.user_id")
    owned_documents = relationship("Document", back_populates="owner", foreign_keys="Document.owner_id")
    audit_logs = relationship("AuditLog", back_populates="user", foreign_keys="AuditLog.user_id")
    access_requests = relationship("AccessRequest", back_populates="user", foreign_keys="AccessRequest.email", primaryjoin="User.email == AccessRequest.email")
    queries = relationship("ChatQuery", back_populates="user", cascade="all, delete-orphan", foreign_keys="ChatQuery.user_id")


class AccessRequest(Base):
    __tablename__ = "access_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    department = Column(String(100))
    reason = Column(Text)
    status = Column(SQLEnum(UserStatus), default=UserStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    notes = Column(Text)
    
    # Relationships
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    user = relationship("User", back_populates="access_requests", foreign_keys=[email], primaryjoin="AccessRequest.email == User.email")


class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    document_acls = relationship("DocumentACL", back_populates="role")


class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")


class UserRole(Base):
    __tablename__ = "user_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="roles", foreign_keys=[user_id])
    role = relationship("Role", back_populates="user_roles")
    
    __table_args__ = (
        Index('idx_user_role', 'user_id', 'role_id', unique=True),
    )


class RolePermission(Base):
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")
    
    __table_args__ = (
        Index('idx_role_permission', 'role_id', 'permission_id', unique=True),
    )


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    department = Column(String(100))
    classification = Column(SQLEnum(ClassificationLevel), default=ClassificationLevel.INTERNAL, nullable=False)
    description = Column(Text)
    checksum = Column(String(64))  # SHA-256
    file_size = Column(Integer)  # bytes
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="owned_documents", foreign_keys=[owner_id])
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    acls = relationship("DocumentACL", back_populates="document", cascade="all, delete-orphan")
    queries = relationship("QueryDocument", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_id = Column(String(100), unique=True, nullable=False, index=True)  # UUID for Chroma
    content_encrypted = Column(Text, nullable=False)  # AES-GCM encrypted content
    chunk_index = Column(Integer, nullable=False)  # Position in document
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    document = relationship("Document", back_populates="chunks")
    
    __table_args__ = (
        Index('idx_doc_chunk', 'document_id', 'chunk_index'),
    )


class DocumentACL(Base):
    __tablename__ = "document_acl"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    document = relationship("Document", back_populates="acls")
    role = relationship("Role", back_populates="document_acls")
    user = relationship("User")
    
    __table_args__ = (
        Index('idx_doc_acl_role', 'document_id', 'role_id'),
        Index('idx_doc_acl_user', 'document_id', 'user_id'),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(100), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    ip_address = Column(String(45))  # IPv6 support
    user_agent = Column(String(500))
    outcome = Column(String(20), nullable=False)  # SUCCESS, FAILURE, BLOCKED
    reason = Column(Text)
    extra_metadata = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    __table_args__ = (
        Index('idx_audit_composite', 'user_id', 'action', 'created_at'),
    )


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(100), unique=True, nullable=False, index=True)  # JWT ID
    revoked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)  # When token would naturally expire
    
    __table_args__ = (
        Index('idx_revoked_expires', 'expires_at'),
    )


class ChatQuery(Base):
    """
    Represents the 'Requête' class from the UML Diagram,
    tracking questions posed to the system, their status, and dates.
    """
    __tablename__ = "chat_queries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    query_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=True)
    status = Column(SQLEnum(QueryStatus), default=QueryStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="queries")
    documents = relationship("QueryDocument", back_populates="query", cascade="all, delete-orphan")


class QueryDocument(Base):
    """
    Association table linking queries to the documents utilized in the response.
    """
    __tablename__ = "query_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("chat_queries.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    query = relationship("ChatQuery", back_populates="documents")
    document = relationship("Document", back_populates="queries")
    
    __table_args__ = (
        Index('idx_query_doc', 'query_id', 'document_id', unique=True),
    )
