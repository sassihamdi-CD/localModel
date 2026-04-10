from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import json

from app.models.models import AuditLog


class AuditService:
    """
    Comprehensive audit logging service for all system events.
    Logs authentication, admin actions, document operations, and chat queries.
    """
    
    async def log_auth_event(
        self,
        db: AsyncSession,
        request_id: str,
        user_id: Optional[int],
        action: str,
        ip_address: str,
        user_agent: str,
        outcome: str,
        reason: Optional[str] = None,
    ):
        """Log authentication events (login, logout, token refresh)."""
        await self._create_log(
            db=db,
            request_id=request_id,
            user_id=user_id,
            action=action,
            resource_type="AUTH",
            resource_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
            outcome=outcome,
            reason=reason,
        )
    
    async def log_admin_action(
        self,
        db: AsyncSession,
        request_id: str,
        user_id: int,
        action: str,
        resource_type: str,
        resource_id: str,
        ip_address: str,
        user_agent: str,
        outcome: str,
        metadata: Optional[dict] = None,
        reason: Optional[str] = None,
    ):
        """Log admin actions (approve/deny, role changes, etc.)."""
        await self._create_log(
            db=db,
            request_id=request_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            outcome=outcome,
            reason=reason,
            metadata=metadata,
        )
    
    async def log_document_action(
        self,
        db: AsyncSession,
        request_id: str,
        user_id: int,
        action: str,
        document_id: int,
        ip_address: str,
        user_agent: str,
        outcome: str,
        reason: Optional[str] = None,
    ):
        """Log document operations (upload, view, edit, delete)."""
        await self._create_log(
            db=db,
            request_id=request_id,
            user_id=user_id,
            action=action,
            resource_type="DOCUMENT",
            resource_id=str(document_id),
            ip_address=ip_address,
            user_agent=user_agent,
            outcome=outcome,
            reason=reason,
        )
    
    async def log_chat_action(
        self,
        db: AsyncSession,
        request_id: str,
        user_id: int,
        action: str,
        ip_address: str,
        user_agent: str,
        outcome: str,
        metadata: Optional[dict] = None,
        reason: Optional[str] = None,
    ):
        """
        Log chat queries with retrieved documents and ACL decisions.
        
        Metadata should include:
        - query: the user query
        - retrieved_doc_ids: list of document IDs retrieved
        - chunk_ids: list of chunk IDs used
        - blocked: whether query was blocked
        """
        await self._create_log(
            db=db,
            request_id=request_id,
            user_id=user_id,
            action=action,
            resource_type="CHAT",
            resource_id=None,
            ip_address=ip_address,
            user_agent=user_agent,
            outcome=outcome,
            reason=reason,
            metadata=metadata,
        )
    
    async def _create_log(
        self,
        db: AsyncSession,
        request_id: str,
        user_id: Optional[int],
        action: str,
        resource_type: Optional[str],
        resource_id: Optional[str],
        ip_address: str,
        user_agent: str,
        outcome: str,
        reason: Optional[str] = None,
        metadata: Optional[dict] = None,
    ):
        """Create an audit log entry."""
        log = AuditLog(
            request_id=request_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            outcome=outcome,
            reason=reason,
            extra_metadata=json.dumps(metadata) if metadata else None,
        )
        
        db.add(log)
        await db.commit()


audit_service = AuditService()
