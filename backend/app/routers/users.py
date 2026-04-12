from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from app.core.database import get_db
from app.schemas.schemas import PasswordChangeRequest
from app.models.models import User, UserRole, Role, Permission, RolePermission
from app.dependencies import get_current_user
from app.core.security import hash_password, verify_password, validate_password_strength
from fastapi import HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["Users"])


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None


class UserMeResponse(BaseModel):
    id: int
    email: str
    name: str
    department: Optional[str] = None
    status: str
    is_active: bool
    roles: List[str] = []
    permissions: List[str] = []

    class Config:
        from_attributes = True


async def _get_user_roles_and_permissions(db: AsyncSession, user_id: int):
    role_stmt = select(Role.name).join(UserRole, UserRole.role_id == Role.id).where(UserRole.user_id == user_id)
    role_res = await db.execute(role_stmt)
    roles = [r[0] for r in role_res.all()]

    perm_stmt = (
        select(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .where(UserRole.user_id == user_id)
        .distinct()
    )
    perm_res = await db.execute(perm_stmt)
    permissions = [p[0] for p in perm_res.all()]
    return roles, permissions


@router.get("/me", response_model=UserMeResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user profile with roles and permissions.
    """
    roles, permissions = await _get_user_roles_and_permissions(db, current_user.id)
    return UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        department=current_user.department,
        status=current_user.status,
        is_active=current_user.is_active,
        roles=roles,
        permissions=permissions,
    )


@router.patch("/me", response_model=UserMeResponse)
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user profile (name, department).
    """
    if data.name is not None:
        current_user.name = data.name
    if data.department is not None:
        current_user.department = data.department
    await db.commit()
    await db.refresh(current_user)
    roles, permissions = await _get_user_roles_and_permissions(db, current_user.id)
    return UserMeResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        department=current_user.department,
        status=current_user.status,
        is_active=current_user.is_active,
        roles=roles,
        permissions=permissions,
    )


@router.patch("/me/password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change password for current user.
    """
    # Verify old password
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )

    # Validate new password
    is_valid, error_msg = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    # Update password
    current_user.password_hash = hash_password(data.new_password)
    await db.commit()

    return {"message": "Password changed successfully"}
