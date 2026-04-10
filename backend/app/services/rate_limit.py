from typing import Optional
import redis.asyncio as aioredis
from fastapi import HTTPException, status

from app.core.config import settings


class RateLimiter:
    """
    Redis-based rate limiting for preventing brute force attacks.
    """
    
    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None
    
    async def initialize(self):
        """Initialize Redis connection."""
        try:
            self.redis_client = await aioredis.from_url(
                f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}",
                encoding="utf-8",
                decode_responses=True,
            )
        except Exception as e:
            print(f"Warning: Could not connect to Redis for rate limiting: {e}")
            self.redis_client = None
    
    async def check_rate_limit(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> tuple[bool, int]:
        """
        Check if request is within rate limit.
        
        Args:
            key: Unique identifier for this rate limit (e.g., "login:192.168.1.1")
            max_requests: Maximum number of requests allowed
            window_seconds: Time window in seconds
        
        Returns: (is_allowed, remaining_requests)
        """
        if not self.redis_client:
            # If Redis is not available, allow request
            return True, max_requests
        
        try:
            # Increment counter
            current = await self.redis_client.incr(key)
            
            # Set expiry on first request
            if current == 1:
                await self.redis_client.expire(key, window_seconds)
            
            # Check if over limit
            if current > max_requests:
                ttl = await self.redis_client.ttl(key)
                return False, 0
            
            remaining = max_requests - current
            return True, remaining
        
        except Exception as e:
            print(f"Rate limit check error: {e}")
            # On error, allow request to avoid blocking legitimate users
            return True, max_requests
    
    async def check_login_rate_limit(self, ip_address: str):
        """
        Check login rate limit for an IP address.
        Raises HTTPException if rate limit exceeded.
        """
        key = f"rate_limit:login:{ip_address}"
        is_allowed, remaining = await self.check_rate_limit(
            key,
            settings.RATE_LIMIT_LOGIN_REQUESTS,
            settings.RATE_LIMIT_LOGIN_WINDOW,
        )
        
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many login attempts. Please try again later.",
            )
    
    async def check_chat_rate_limit(self, user_id: int):
        """
        Check chat rate limit for a user.
        Raises HTTPException if rate limit exceeded.
        """
        key = f"rate_limit:chat:user_{user_id}"
        is_allowed, remaining = await self.check_rate_limit(
            key,
            settings.RATE_LIMIT_CHAT_REQUESTS,
            settings.RATE_LIMIT_CHAT_WINDOW,
        )
        
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many chat requests. Please slow down.",
            )
    
    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()


rate_limiter = RateLimiter()
