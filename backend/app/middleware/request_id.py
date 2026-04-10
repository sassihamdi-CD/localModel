import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class RequestIdMiddleware(BaseHTTPMiddleware):
    """
    Adds a unique request ID to each request for audit logging and tracing.
    """
    
    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Store in request state for access in routes
        request.state.request_id = request_id
        
        # Call next middleware/route
        response = await call_next(request)
        
        # Add request ID to response headers for client tracking
        response.headers["X-Request-ID"] = request_id
        
        return response


def get_request_id(request: Request) -> str:
    """Helper function to get request ID from request state."""
    return getattr(request.state, "request_id", "unknown")


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request."""
    # Check for X-Forwarded-For header (proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain
        return forwarded_for.split(",")[0].strip()
    
    # Fallback to direct client
    return request.client.host if request.client else "unknown"


def get_user_agent(request: Request) -> str:
    """Extract user agent from request headers."""
    return request.headers.get("User-Agent", "unknown")
