from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import csv
import io

from app.core.database import get_db
from app.schemas.schemas import AuditLogResponse, AuditLogFilter
from app.models.models import AuditLog, User
from app.dependencies import get_current_user, require_view_logs, require_export_logs

router = APIRouter(prefix="/logs", tags=["Audit Logs"])


@router.get("", response_model=List[AuditLogResponse])
async def search_logs(
    filter_params: AuditLogFilter = Depends(),
    current_user: User = Depends(require_view_logs),
    db: AsyncSession = Depends(get_db),
):
    """
    Search and filter audit logs (permissioned).
    """
    query = select(AuditLog)
    
    # Apply filters
    if filter_params.user_id:
        query = query.where(AuditLog.user_id == filter_params.user_id)
    
    if filter_params.action:
        query = query.where(AuditLog.action == filter_params.action)
    
    if filter_params.outcome:
        query = query.where(AuditLog.outcome == filter_params.outcome)
    
    if filter_params.start_date:
        query = query.where(AuditLog.created_at >= filter_params.start_date)
    
    if filter_params.end_date:
        query = query.where(AuditLog.created_at <= filter_params.end_date)
    
    # Order by most recent first
    query = query.order_by(AuditLog.created_at.desc())
    
    # Apply pagination
    query = query.limit(filter_params.limit).offset(filter_params.offset)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return logs


@router.get("/export")
async def export_logs_csv(
    filter_params: AuditLogFilter = Depends(),
    current_user: User = Depends(require_export_logs),
    db: AsyncSession = Depends(get_db),
):
    """
    Export audit logs as CSV (permissioned).
    """
    query = select(AuditLog)
    
    # Apply same filters as search
    if filter_params.user_id:
        query = query.where(AuditLog.user_id == filter_params.user_id)
    
    if filter_params.action:
        query = query.where(AuditLog.action == filter_params.action)
    
    if filter_params.outcome:
        query = query.where(AuditLog.outcome == filter_params.outcome)
    
    if filter_params.start_date:
        query = query.where(AuditLog.created_at >= filter_params.start_date)
    
    if filter_params.end_date:
        query = query.where(AuditLog.created_at <= filter_params.end_date)
    
    query = query.order_by(AuditLog.created_at.desc())
    query = query.limit(filter_params.limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Request ID", "User ID", "Action", "Resource Type",
        "Resource ID", "IP Address", "User Agent", "Outcome", "Reason", "Created At"
    ])
    
    # Data rows
    for log in logs:
        writer.writerow([
            log.id,
            log.request_id,
            log.user_id,
            log.action,
            log.resource_type,
            log.resource_id,
            log.ip_address,
            log.user_agent,
            log.outcome,
            log.reason,
            log.created_at.isoformat(),
        ])
    
    # Return as downloadable file
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"}
    )
