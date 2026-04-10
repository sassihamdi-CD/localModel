from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import User, UserStatus
from app.services.rbac import rbac_service


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    """
    token = credentials.credentials
    
    # Decode token
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user ID from token
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Fetch user from database
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if user.status != UserStatus.ACTIVE or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is {user.status}",
        )
    
    return user


class PermissionChecker:
    """
    Dependency class to check if current user has required permission(s).
    """
    
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        # Check if user has the required permission
        has_perm = await rbac_service.has_permission(
            db, current_user.id, self.required_permission
        )
        
        if not has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires '{self.required_permission}'",
            )
        
        return current_user


class AnyPermissionChecker:
    """
    Dependency class to check if current user has ANY of the required permissions.
    """
    
    def __init__(self, required_permissions: list[str]):
        self.required_permissions = required_permissions
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        has_any = await rbac_service.has_any_permission(
            db, current_user.id, self.required_permissions
        )
        
        if not has_any:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: requires one of {self.required_permissions}",
            )
        
        return current_user


# Common permission checkers (pre-configured)
require_chat = PermissionChecker("CHAT")
require_view_doc = PermissionChecker("VIEW_DOC")
require_add_doc = PermissionChecker("ADD_DOC")
require_edit_doc = PermissionChecker("EDIT_DOC")
require_delete_doc = PermissionChecker("DELETE_DOC")
require_view_logs = PermissionChecker("VIEW_LOGS")
require_export_logs = PermissionChecker("EXPORT_LOGS")
require_manage_users = PermissionChecker("MANAGE_USERS")
require_manage_roles = PermissionChecker("MANAGE_ROLES")
require_manage_permissions = PermissionChecker("MANAGE_PERMISSIONS")

async def require_admin(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency to ensure the current user has the ADMIN role."""
    is_admin = await rbac_service.has_role(db, current_user.id, "ADMIN")
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
