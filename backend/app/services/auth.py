from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.models.models import User, RevokedToken, UserStatus, AccessRequest, Role, UserRole
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    extract_token_jti,
    validate_password_strength,
)
from app.services.audit import audit_service


class AuthService:
    """Authentication service handling login, token management, and user validation."""
    
    async def authenticate_user(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        ip_address: str,
        user_agent: str,
        request_id: str,
    ) -> Optional[User]:
        """
        Authenticate user by email and password.
        Logs the authentication attempt.
        """
        # Fetch user
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            await audit_service.log_auth_event(
                db=db,
                request_id=request_id,
                user_id=None,
                action="LOGIN_ATTEMPT",
                ip_address=ip_address,
                user_agent=user_agent,
                outcome="FAILURE",
                reason=f"User not found: {email}",
            )
            return None
        
        # Verify password
        if not verify_password(password, user.password_hash):
            await audit_service.log_auth_event(
                db=db,
                request_id=request_id,
                user_id=user.id,
                action="LOGIN_ATTEMPT",
                ip_address=ip_address,
                user_agent=user_agent,
                outcome="FAILURE",
                reason="Invalid password",
            )
            return None
        
        # Check if user is active
        if user.status != UserStatus.ACTIVE or not user.is_active:
            await audit_service.log_auth_event(
                db=db,
                request_id=request_id,
                user_id=user.id,
                action="LOGIN_ATTEMPT",
                ip_address=ip_address,
                user_agent=user_agent,
                outcome="BLOCKED",
                reason=f"User status: {user.status}",
            )
            return None
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        await db.commit()
        
        # Log successful login
        await audit_service.log_auth_event(
            db=db,
            request_id=request_id,
            user_id=user.id,
            action="LOGIN_SUCCESS",
            ip_address=ip_address,
            user_agent=user_agent,
            outcome="SUCCESS",
            reason=None,
        )
        
        return user
    
    async def create_tokens(self, user: User) -> Tuple[str, str]:
        """Create access and refresh tokens for user."""
        access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
        refresh_token = create_refresh_token(data={"sub": str(user.id), "email": user.email})
        return access_token, refresh_token
    
    async def refresh_access_token(
        self,
        db: AsyncSession,
        refresh_token: str,
        request_id: str,
        ip_address: str,
        user_agent: str,
    ) -> Optional[Tuple[str, str]]:
        """Refresh access token using refresh token."""
        payload = decode_refresh_token(refresh_token)
        
        if not payload:
            return None
        
        # Check if token is revoked
        jti = payload.get("jti")
        if await self.is_token_revoked(db, jti):
            return None
        
        user_id = int(payload.get("sub"))
        
        # Fetch user
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user or user.status != UserStatus.ACTIVE:
            return None
        
        # Create new tokens
        access_token, new_refresh_token = await self.create_tokens(user)
        
        # Log token refresh
        await audit_service.log_auth_event(
            db=db,
            request_id=request_id,
            user_id=user.id,
            action="TOKEN_REFRESH",
            ip_address=ip_address,
            user_agent=user_agent,
            outcome="SUCCESS",
            reason=None,
        )
        
        return access_token, new_refresh_token
    
    async def revoke_token(self, db: AsyncSession, token: str, expires_at: datetime):
        """Revoke a token by adding its JTI to the revoked_tokens table."""
        jti = extract_token_jti(token)
        
        if not jti:
            return
        
        revoked_token = RevokedToken(
            jti=jti,
            expires_at=expires_at,
        )
        
        db.add(revoked_token)
        await db.commit()
    
    async def is_token_revoked(self, db: AsyncSession, jti: str) -> bool:
        """Check if a token JTI is in the revoked list."""
        result = await db.execute(
            select(RevokedToken).where(RevokedToken.jti == jti)
        )
        return result.scalar_one_or_none() is not None
    
    async def logout(
        self,
        db: AsyncSession,
        access_token: str,
        refresh_token: str,
        request_id: str,
        user_id: int,
        ip_address: str,
        user_agent: str,
    ):
        """Logout user by revoking both access and refresh tokens."""
        # Decode tokens to get expiry
        access_payload = decode_access_token(access_token)
        refresh_payload = decode_refresh_token(refresh_token)
        
        if access_payload:
            await self.revoke_token(
                db,
                access_token,
                datetime.fromtimestamp(access_payload.get("exp")),
            )
        
        if refresh_payload:
            await self.revoke_token(
                db,
                refresh_token,
                datetime.fromtimestamp(refresh_payload.get("exp")),
            )
        
        # Log logout
        await audit_service.log_auth_event(
            db=db,
            request_id=request_id,
            user_id=user_id,
            action="LOGOUT",
            ip_address=ip_address,
            user_agent=user_agent,
            outcome="SUCCESS",
            reason=None,
        )
    
    async def create_user(
        self,
        db: AsyncSession,
        email: str,
        name: str,
        password: str,
        department: Optional[str] = None,
        status: UserStatus = UserStatus.PENDING,
    ) -> Tuple[Optional[User], Optional[str]]:
        """
        Create a new user with password validation.
        Returns: (user, error_message)
        """
        # Validate password strength
        is_valid, error_msg = validate_password_strength(password)
        if not is_valid:
            return None, error_msg
        
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            return None, "User with this email already exists"
        
        # Hash password
        password_hash = hash_password(password)
        
        # Create user
        user = User(
            email=email,
            name=name,
            password_hash=password_hash,
            department=department,
            status=status,
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
        return user, None



    async def create_access_request(
        self,
        db: AsyncSession,
        data, #: AccessRequestCreate
    ) -> AccessRequest:
        """Create a new access request."""
        # Check if email already used in users
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise ValueError("Email already registered")

        # Check if pending request exists
        result = await db.execute(select(AccessRequest).where(AccessRequest.email == data.email, AccessRequest.status == "PENDING"))
        if result.scalar_one_or_none():
            raise ValueError("A pending request for this email already exists")

        # Validate and hash the user's chosen password
        is_valid, error_msg = validate_password_strength(data.password)
        if not is_valid:
            raise ValueError(error_msg)

        password_hash = hash_password(data.password)

        request = AccessRequest(
            email=data.email,
            name=data.name,
            department=data.department,
            reason=data.reason,
            password_hash=password_hash,
            status="PENDING",
            created_at=datetime.utcnow()
        )
        db.add(request)
        await db.commit()
        await db.refresh(request)
        return request

    async def get_pending_requests(self, db: AsyncSession):
        """Get all pending access requests."""
        result = await db.execute(select(AccessRequest).where(AccessRequest.status == "PENDING").order_by(AccessRequest.created_at.desc()))
        return result.scalars().all()

    async def approve_access_request(
        self,
        db: AsyncSession,
        request_id: int,
        admin_id: int,
    ) -> User:
        """Approve access request and create user."""
        request = await db.get(AccessRequest, request_id)
        if not request or request.status != "PENDING":
             raise ValueError("Request not found or not pending")
        
        # Use the password hash the user chose when submitting their request
        if not request.password_hash:
            raise ValueError("Access request has no password set. User must re-submit their request.")

        user = User(
            email=request.email,
            name=request.name,
            department=request.department,
            password_hash=request.password_hash,
            status=UserStatus.ACTIVE,
            created_at=datetime.utcnow()
        )
        db.add(user)

        # Update request
        request.status = "ACTIVE"
        request.reviewed_by = admin_id
        request.reviewed_at = datetime.utcnow()
        request.notes = "Approved by admin."
        
        # Assign default EMPLOYEE role
        result = await db.execute(select(Role).where(Role.name == "EMPLOYEE"))
        role = result.scalar_one_or_none()
        if role:
            user_role = UserRole(user_id=user.id, role_id=role.id, assigned_at=datetime.utcnow(), assigned_by=admin_id)
            # Need to flush user first to get ID
            await db.flush()
            user_role.user_id = user.id
            db.add(user_role)
            
        await db.commit()
        await db.refresh(user)
        return user

    async def deny_access_request(
        self,
        db: AsyncSession,
        request_id: int,
        admin_id: int,
    ):
        """Deny access request."""
        request = await db.get(AccessRequest, request_id)
        if not request or request.status != "PENDING":
             raise ValueError("Request not found or not pending")
             
        request.status = "DENIED"
        request.reviewed_by = admin_id
        request.reviewed_at = datetime.utcnow()
        
        await db.commit()


auth_service = AuthService()

