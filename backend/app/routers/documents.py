from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, delete
from typing import List, Optional
import os
import shutil
import uuid
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import User, Document, DocumentACL, UserRole, Role, ClassificationLevel
from app.schemas.schemas import DocumentResponse
from app.dependencies import get_current_user, require_add_doc, require_delete_doc, require_view_doc
from app.services.rag import rag_service
from app.services.rbac import rbac_service
from app.services.audit import audit_service

router = APIRouter(prefix="/docs", tags=["Documents"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    department: Optional[str] = Form(None),
    classification: str = Form("INTERNAL"),
    description: Optional[str] = Form(None),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(require_add_doc),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a document, parse it, and ingest into RAG system.
    """
    allowed_types = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, DOCX, and TXT allowed.")

    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    file_size = os.path.getsize(file_path)

    try:
        doc = Document(
            title=title,
            filename=file.filename,
            file_path=file_path,
            owner_id=current_user.id,
            department=department or current_user.department,
            classification=ClassificationLevel(classification),
            description=description,
            file_size=file_size,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        background_tasks.add_task(rag_service.ingest_document, db, doc.id, file_path)

        await audit_service.log_document_action(
            db=db, request_id=str(uuid.uuid4()), user_id=current_user.id,
            action="DOCUMENT_UPLOAD", document_id=doc.id,
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", "unknown"),
            outcome="SUCCESS",
        )
        return doc

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    search: Optional[str] = Query(None, description="Search by title"),
    classification: Optional[str] = Query(None, description="Filter by classification level"),
    current_user: User = Depends(require_view_doc),
    db: AsyncSession = Depends(get_db),
):
    """
    List documents visible to the current user based on RBAC and classification.
    - ADMIN: sees all documents
    - Others: see PUBLIC + INTERNAL + any doc they have explicit ACL access to
    """
    is_admin = await rbac_service.has_role(db, current_user.id, "ADMIN")

    query = select(Document).where(Document.is_deleted == False)

    if not is_admin:
        # Non-admin: PUBLIC + INTERNAL always visible
        # CONFIDENTIAL + RESTRICTED: only if in document_acl by user or role
        acl_doc_ids_stmt = (
            select(DocumentACL.document_id)
            .join(UserRole, UserRole.role_id == DocumentACL.role_id, isouter=True)
            .where(
                or_(
                    DocumentACL.user_id == current_user.id,
                    UserRole.user_id == current_user.id,
                )
            )
        )
        acl_result = await db.execute(acl_doc_ids_stmt)
        acl_doc_ids = [row[0] for row in acl_result.all()]

        query = query.where(
            or_(
                Document.classification.in_([ClassificationLevel.PUBLIC, ClassificationLevel.INTERNAL]),
                Document.id.in_(acl_doc_ids),
                Document.owner_id == current_user.id,
            )
        )

    # Apply search filter
    if search and search.strip():
        query = query.where(Document.title.ilike(f"%{search.strip()}%"))

    # Apply classification filter
    if classification and classification.upper() in [c.value for c in ClassificationLevel]:
        query = query.where(Document.classification == ClassificationLevel(classification.upper()))

    query = query.order_by(Document.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: User = Depends(require_delete_doc),
    db: AsyncSession = Depends(get_db),
):
    """
    Soft delete a document and remove its embeddings from the vector store.
    """
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    is_admin = await rbac_service.has_role(db, current_user.id, "ADMIN")
    if not is_admin and doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this document.")

    doc.is_deleted = True
    await db.commit()

    background_tasks.add_task(rag_service.delete_document_chunks, doc_id)

    await audit_service.log_document_action(
        db=db, request_id=str(uuid.uuid4()), user_id=current_user.id,
        action="DOCUMENT_DELETE", document_id=doc_id,
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent", "unknown"),
        outcome="SUCCESS",
    )
    return None


# ── Document ACL Management ──────────────────────────────────────────────────

class ACLGrantRequest(BaseModel):
    role_id: Optional[int] = None
    user_id: Optional[int] = None


@router.get("/{doc_id}/acl")
async def get_document_acl(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get ACL entries for a document. Admin only.
    """
    is_admin = await rbac_service.has_role(db, current_user.id, "ADMIN")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")

    doc = await db.get(Document, doc_id)
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found.")

    result = await db.execute(
        select(DocumentACL).where(DocumentACL.document_id == doc_id)
    )
    entries = result.scalars().all()

    acl_list = []
    for entry in entries:
        item: dict = {"id": entry.id, "document_id": doc_id}
        if entry.role_id:
            role = await db.get(Role, entry.role_id)
            item["type"] = "role"
            item["role_id"] = entry.role_id
            item["label"] = role.name if role else f"Role #{entry.role_id}"
        elif entry.user_id:
            user = await db.get(User, entry.user_id)
            item["type"] = "user"
            item["user_id"] = entry.user_id
            item["label"] = f"{user.name} ({user.email})" if user else f"User #{entry.user_id}"
        acl_list.append(item)

    return acl_list


@router.post("/{doc_id}/acl", status_code=status.HTTP_201_CREATED)
async def grant_document_access(
    doc_id: int,
    body: ACLGrantRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Grant a role or user access to a CONFIDENTIAL/RESTRICTED document. Admin only.
    """
    is_admin = await rbac_service.has_role(db, current_user.id, "ADMIN")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")

    if not body.role_id and not body.user_id:
        raise HTTPException(status_code=400, detail="Provide either role_id or user_id.")

    doc = await db.get(Document, doc_id)
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found.")

    entry = DocumentACL(
        document_id=doc_id,
        role_id=body.role_id,
        user_id=body.user_id,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"message": "Access granted.", "acl_id": entry.id}


@router.delete("/{doc_id}/acl/{acl_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_document_access(
    doc_id: int,
    acl_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Revoke an ACL entry from a document. Admin only.
    """
    is_admin = await rbac_service.has_role(db, current_user.id, "ADMIN")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")

    entry = await db.get(DocumentACL, acl_id)
    if not entry or entry.document_id != doc_id:
        raise HTTPException(status_code=404, detail="ACL entry not found.")

    await db.delete(entry)
    await db.commit()
    return None


@router.get("/restricted", response_model=List[DocumentResponse])
async def list_restricted_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all CONFIDENTIAL and RESTRICTED documents. Admin only.
    """
    is_admin = await rbac_service.has_role(db, current_user.id, "ADMIN")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")

    result = await db.execute(
        select(Document)
        .where(Document.is_deleted == False)
        .where(Document.classification.in_([ClassificationLevel.CONFIDENTIAL, ClassificationLevel.RESTRICTED]))
        .order_by(Document.classification, Document.created_at.desc())
    )
    return result.scalars().all()
