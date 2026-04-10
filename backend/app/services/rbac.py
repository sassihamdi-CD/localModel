from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List

from app.models.models import User, Role, Permission, UserRole, RolePermission

class RBACService:
    """
    Service for Role-Based Access Control checks.
    """
    
    async def has_permission(self, db: AsyncSession, user_id: int, permission_name: str) -> bool:
        """
        Check if user has a specific permission via any of their roles.
        """
        # Optimized query to check existence
        stmt = select(Permission.id).join(
            RolePermission, RolePermission.permission_id == Permission.id
        ).join(
            UserRole, UserRole.role_id == RolePermission.role_id
        ).where(
            and_(
                UserRole.user_id == user_id,
                Permission.name == permission_name
            )
        ).limit(1)
        
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def has_any_permission(self, db: AsyncSession, user_id: int, permissions: List[str]) -> bool:
        """
        Check if user has ANY of the enlisted permissions.
        """
        stmt = select(Permission.id).join(
            RolePermission, RolePermission.permission_id == Permission.id
        ).join(
            UserRole, UserRole.role_id == RolePermission.role_id
        ).where(
            and_(
                UserRole.user_id == user_id,
                Permission.name.in_(permissions)
            )
        ).limit(1)
        
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_user_permissions(self, db: AsyncSession, user_id: int) -> List[str]:
        """
        Get all permission names for a user.
        """
        stmt = select(Permission.name).join(
            RolePermission, RolePermission.permission_id == Permission.id
        ).join(
            UserRole, UserRole.role_id == RolePermission.role_id
        ).where(
            UserRole.user_id == user_id
        ).distinct()
        
        result = await db.execute(stmt)
        return result.scalars().all()

    async def has_role(self, db: AsyncSession, user_id: int, role_name: str) -> bool:
        """Check if user has a specific role."""
        stmt = select(Role.id).join(
            UserRole, UserRole.role_id == Role.id
        ).where(
            and_(
                UserRole.user_id == user_id,
                Role.name == role_name
            )
        ).limit(1)
        
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None

rbac_service = RBACService()
