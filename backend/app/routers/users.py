from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.schemas import UserResponse, PasswordChangeRequest
from app.models.models import User
from app.dependencies import get_current_user
from app.core.security import hash_password, verify_password, validate_password_strength
from fastapi import HTTPException, status

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user profile.
    """
    return current_user


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
