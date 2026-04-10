from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.models import UserStatus, ClassificationLevel


# ============= Auth Schemas =============

class AccessRequestCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    reason: Optional[str] = None


class AccessRequestResponse(BaseModel):
    id: int
    email: str
    name: str
    department: Optional[str]
    reason: Optional[str]
    status: UserStatus
    created_at: datetime
    reviewed_by: Optional[int]
    reviewed_at: Optional[datetime]
    notes: Optional[str]
    
    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ============= User Schemas =============

class UserBase(BaseModel):
    email: EmailStr
    name: str
    department: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    status: Optional[UserStatus] = None


class UserResponse(UserBase):
    id: int
    status: UserStatus
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserWithRoles(UserResponse):
    roles: List[str] = []


class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


# ============= Role & Permission Schemas =============

class RoleBase(BaseModel):
    name: str = Field(..., max_length=50)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class RoleWithPermissions(RoleResponse):
    permissions: List[str] = []


class PermissionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    
    class Config:
        from_attributes = True


class UserRoleAssignment(BaseModel):
    user_id: int
    role_ids: List[int]


# ============= Document Schemas =============

class DocumentBase(BaseModel):
    title: str = Field(..., max_length=255)
    department: Optional[str] = Field(None, max_length=100)
    classification: ClassificationLevel = ClassificationLevel.INTERNAL
    description: Optional[str] = None


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    classification: Optional[ClassificationLevel] = None
    description: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: int
    filename: str
    owner_id: int
    file_size: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class DocumentACLItem(BaseModel):
    role_id: Optional[int] = None
    user_id: Optional[int] = None


class DocumentACLUpdate(BaseModel):
    acl_items: List[DocumentACLItem]


class DocumentWithACL(DocumentResponse):
    allowed_roles: List[int] = []
    allowed_users: List[int] = []


# ============= Chat Schemas =============

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)


class Citation(BaseModel):
    document_id: int
    document_title: str
    chunk_id: str


class ChatResponse(BaseModel):
    answer: str
    citations: List[str]
    retrieved_doc_ids: List[int]
    request_id: str
    blocked: bool = False


class ChatQueryResponse(BaseModel):
    id: int
    query_text: str
    response_text: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============= Audit Log Schemas =============

class AuditLogResponse(BaseModel):
    id: int
    request_id: str
    user_id: Optional[int]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    outcome: str
    reason: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    user_id: Optional[int] = None
    action: Optional[str] = None
    outcome: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(100, le=1000)
    offset: int = Field(0, ge=0)


# ============= Admin Schemas =============

class ApproveAccessRequest(BaseModel):
    role_ids: List[int] = Field(..., min_length=1)
    notes: Optional[str] = None


class DenyAccessRequest(BaseModel):
    notes: Optional[str] = None


class AdminUserUpdate(BaseModel):
    status: Optional[UserStatus] = None
    role_ids: Optional[List[int]] = None


# ============= Common Schemas =============

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime


class ErrorResponse(BaseModel):
    detail: str
    request_id: Optional[str] = None
