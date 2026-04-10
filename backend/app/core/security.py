from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.hash import argon2
import re
import uuid

from app.core.config import settings


# Argon2 password hashing context
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__time_cost=settings.ARGON2_TIME_COST,
    argon2__memory_cost=settings.ARGON2_MEMORY_COST,
    argon2__parallelism=settings.ARGON2_PARALLELISM,
)


def hash_password(password: str) -> str:
    """Hash a password using Argon2."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password against security policy.
    
    Returns: (is_valid, error_message)
    """
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        return False, f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters long"
    
    if settings.PASSWORD_REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if settings.PASSWORD_REQUIRE_NUMBER and not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    if settings.PASSWORD_REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, ""


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),  # JWT ID for revocation
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_REFRESH_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate an access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        
        # Verify token type
        if payload.get("type") != "access":
            return None
        
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a refresh token."""
    try:
        payload = jwt.decode(token, settings.JWT_REFRESH_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        
        # Verify token type
        if payload.get("type") != "refresh":
            return None
        
        return payload
    except JWTError:
        return None


def extract_token_jti(token: str) -> Optional[str]:
    """Extract JTI (JWT ID) from token without full validation."""
    try:
        # Decode without verification to get JTI
        unverified = jwt.get_unverified_claims(token)
        return unverified.get("jti")
    except JWTError:
        return None
