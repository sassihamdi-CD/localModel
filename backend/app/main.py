from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.database import get_db
from app.middleware.request_id import RequestIdMiddleware
from app.services.rate_limit import rate_limiter
from app.routers import auth, admin, documents, chat, logs, users
from app.models.models import Document, ChatQuery, AuditLog
from app.dependencies import get_current_user
from app.models.models import User


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    print("Starting SecureDoc-RAG...")
    
    # Initialize rate limiter
    await rate_limiter.initialize()
    
    print("SecureDoc-RAG is ready!")
    
    yield
    
    # Shutdown
    print("Shutting down SecureDoc-RAG...")
    await rate_limiter.close()


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Privacy-Preserving Retrieval-Augmented Chatbot for Sensitive Organizational Documents",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware
app.add_middleware(RequestIdMiddleware)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(logs.router, prefix="/api")


# Dashboard stats endpoint
@app.get("/api/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate stats for the dashboard."""
    doc_count = (await db.execute(select(func.count()).select_from(Document))).scalar_one()
    query_count = (await db.execute(select(func.count()).select_from(ChatQuery))).scalar_one()
    blocked_count = (await db.execute(
        select(func.count()).select_from(AuditLog).where(AuditLog.outcome == "BLOCKED")
    )).scalar_one()
    return {
        "documents": doc_count,
        "queries": query_count,
        "intercepted_threats": blocked_count,
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    from app.middleware.request_id import get_request_id
    
    request_id = get_request_id(request)
    
    # Log the error (in production, use proper logging)
    print(f"Error [Request ID: {request_id}]: {str(exc)}")
    
    # Don't expose internal errors in production
    if settings.ENVIRONMENT == "production":
        detail = "An internal error occurred"
    else:
        detail = str(exc)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": detail,
            "request_id": request_id,
        },
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
