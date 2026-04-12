from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
import uuid

from app.core.database import get_db
from app.schemas.schemas import AccessRequestResponse, UserResponse, AdminUserUpdate, ApproveAccessRequest
from app.models.models import AccessRequest, User, UserRole, Role, UserStatus
from app.services.auth import auth_service
from app.services.audit import audit_service
from app.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/access-requests", response_model=List[AccessRequestResponse])
async def list_access_requests(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    List all pending access requests.
    """
    return await auth_service.get_pending_requests(db)


@router.post("/access-requests/{request_id}/approve", status_code=status.HTTP_200_OK)
async def approve_request(
    request_id: int,
    body: ApproveAccessRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Approve an access request, creating a user and sending email (mock).
    """
    user = await auth_service.approve_access_request(db, request_id, admin.id)
    await audit_service.log_admin_action(
        db=db, request_id=str(uuid.uuid4()), user_id=admin.id,
        action="APPROVE_ACCESS_REQUEST", resource_type="ACCESS_REQUEST",
        resource_id=str(request_id),
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", "unknown"),
        outcome="SUCCESS", metadata={"created_user": user.email},
    )
    return {"message": f"User {user.email} created and approved."}


@router.post("/access-requests/{request_id}/deny", status_code=status.HTTP_200_OK)
async def deny_request(
    request_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Deny an access request.
    """
    await auth_service.deny_access_request(db, request_id, admin.id)
    await audit_service.log_admin_action(
        db=db, request_id=str(uuid.uuid4()), user_id=admin.id,
        action="DENY_ACCESS_REQUEST", resource_type="ACCESS_REQUEST",
        resource_id=str(request_id),
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", "unknown"),
        outcome="SUCCESS",
    )
    return {"message": "Request denied."}


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    List all users (admin only).
    """
    # Simple list all users
    from sqlalchemy import select
    query = select(User).order_by(User.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/roles")
async def list_roles(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    List all available roles.
    """
    result = await db.execute(select(Role).order_by(Role.id))
    roles = result.scalars().all()
    return [{"id": r.id, "name": r.name, "description": r.description} for r in roles]


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    body: AdminUserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Update user status and/or roles.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = {}
    if body.status is not None:
        changes["status"] = body.status
        user.status = body.status
        user.is_active = body.status == UserStatus.ACTIVE

    if body.role_ids is not None:
        await db.execute(delete(UserRole).where(UserRole.user_id == user_id))
        assigned_roles = []
        for role_id in body.role_ids:
            role_result = await db.execute(select(Role).where(Role.id == role_id))
            role = role_result.scalar_one_or_none()
            if role:
                db.add(UserRole(user_id=user_id, role_id=role_id))
                assigned_roles.append(role.name)
        changes["roles"] = assigned_roles

    await db.commit()
    await audit_service.log_admin_action(
        db=db, request_id=str(uuid.uuid4()), user_id=admin.id,
        action="UPDATE_USER", resource_type="USER", resource_id=str(user_id),
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", "unknown"),
        outcome="SUCCESS", metadata={"changes": changes, "target_email": user.email},
    )
    return {"message": "User updated successfully"}
