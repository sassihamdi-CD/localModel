from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List
import uuid

from app.core.database import get_db
from app.models.models import User, ChatQuery, QueryStatus, QueryDocument
from app.schemas.schemas import ChatResponse, ChatMessage, ChatQueryResponse
from app.dependencies import get_current_user, require_chat
from app.services.rag import rag_service
from app.services.audit import audit_service
from app.services.security_filter import security_filter

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/history", response_model=List[ChatQueryResponse])
async def get_chat_history(
    current_user: User = Depends(require_chat),
    db: AsyncSession = Depends(get_db),
    limit: int = 50
):
    """
    Retrieve the user's chat history (les requêtes).
    """
    result = await db.execute(
        select(ChatQuery)
        .where(ChatQuery.user_id == current_user.id)
        .order_by(desc(ChatQuery.created_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.delete("/history/{query_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_history(
    query_id: int,
    current_user: User = Depends(require_chat),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a specific chat history item. Only admins or the owner can delete it.
    """
    # Verify ownership or admin role
    result = await db.execute(select(ChatQuery).where(ChatQuery.id == query_id))
    query_record = result.scalars().first()
    
    if not query_record:
        raise HTTPException(status_code=404, detail="Chat history not found")
        
    # Ensure the user owns the query
    if query_record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this history")
        
    await db.delete(query_record)
    await db.commit()
    return None


@router.post("", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    request: Request,
    background_tasks: BackgroundTasks, # For async logging if needed
    current_user: User = Depends(require_chat),
    db: AsyncSession = Depends(get_db),
):
    """
    Secure RAG Chat endpoint.
    Retrieves documents based on user permissions and answers query.
    Filter for prompt injection, log query into ChatQuery.
    """
    request_id = str(uuid.uuid4())
    ip_address = request.client.host
    user_agent = request.headers.get("user-agent", "unknown")
    
    # 1. Prompt Injection Detection
    if security_filter.detect_prompt_injection(message.message):
        # Create blocked query record
        query_record = ChatQuery(
            user_id=current_user.id,
            query_text=message.message,
            status=QueryStatus.BLOCKED,
            response_text="Prompt injection detected."
        )
        db.add(query_record)
        
        await audit_service.log_chat_action(
            db=db, request_id=request_id, user_id=current_user.id,
            action="CHAT_QUERY", ip_address=ip_address, user_agent=user_agent,
            outcome="BLOCKED", reason="Prompt injection attempt",
            metadata={"query": message.message}
        )
        await db.commit()
        return {
            "answer": "Security alert: Prompt injection detected. Your request has been blocked.",
            "citations": [],
            "retrieved_doc_ids": [],
            "blocked": True,
            "request_id": request_id
        }

    # 2. Create the ChatQuery record
    query_record = ChatQuery(
        user_id=current_user.id,
        query_text=message.message,
        status=QueryStatus.PENDING
    )
    db.add(query_record)
    await db.flush() # Get query_record.id

    # 3. Call RAG service
    try:
        response = await rag_service.query(db, current_user, message.message)
        
        # Add request_id to response
        response["request_id"] = request_id
        
        # 4. Update ChatQuery
        query_record.response_text = response["answer"]
        query_record.status = QueryStatus.SUCCESS
        
        # 5. Link documents to query
        retrieved_ids = response.get("retrieved_doc_ids", [])
        for doc_id in retrieved_ids:
            db.add(QueryDocument(query_id=query_record.id, document_id=doc_id))
            
        # 6. Log success
        await audit_service.log_chat_action(
            db=db,
            request_id=request_id,
            user_id=current_user.id,
            action="CHAT_QUERY",
            ip_address=ip_address,
            user_agent=user_agent,
            outcome="SUCCESS",
            metadata={
                "query": message.message,
                "retrieved_doc_ids": retrieved_ids
            }
        )
        await db.commit()
        return response
        
    except ValueError as e:
        query_record.status = QueryStatus.BLOCKED
        query_record.response_text = str(e)
        await audit_service.log_chat_action(
            db=db, request_id=request_id, user_id=current_user.id,
            action="CHAT_QUERY", ip_address=ip_address, user_agent=user_agent,
            outcome="BLOCKED", reason=str(e), metadata={"query": message.message}
        )
        await db.commit()
        return {
             "answer": f"I cannot answer that. {str(e)}",
             "citations": [],
             "retrieved_doc_ids": [],
             "blocked": True,
             "request_id": request_id
         }
    except Exception as e:
        query_record.status = QueryStatus.FAILED
        query_record.response_text = "Internal server error"
        await audit_service.log_chat_action(
            db=db, request_id=request_id, user_id=current_user.id,
            action="CHAT_QUERY", ip_address=ip_address, user_agent=user_agent,
            outcome="FAILURE", reason=str(e), metadata={"query": message.message}
        )
        await db.commit()
        raise HTTPException(status_code=500, detail="Internal server error")
