from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.schemas.schemas import AccessRequestResponse, UserResponse
from app.models.models import AccessRequest, User
from app.services.auth import auth_service
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
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Approve an access request, creating a user and sending email (mock).
    """
    user = await auth_service.approve_access_request(db, request_id, admin.id)
    return {"message": f"User {user.email} created and approved."}


@router.post("/access-requests/{request_id}/deny", status_code=status.HTTP_200_OK)
async def deny_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Deny an access request.
    """
    await auth_service.deny_access_request(db, request_id, admin.id)
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


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    status: str = None, # Simplified for now
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Update user status or roles.
    """
    from sqlalchemy import select
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if status:
        if status not in ["ACTIVE", "SUSPENDED", "DENIED"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        user.status = status
        
    await db.commit()
    return {"message": "User updated"}
