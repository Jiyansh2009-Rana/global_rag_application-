import json
import uuid
import logging
from fastapi import APIRouter, HTTPException, Depends, Request,Query
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

from core.database import supabase_client
from core.security import get_current_user
from service.common.models import (
    RAGRequest,
    QueryMode,
    TokenClaims,
)
from service.upload.helper import get_jina_embeddings
from service.query.helper import (
    retrieve_global_neon,
    retrieve_local_redis,
    stream_llm_answer,
    stream_direct_answer,
    classify_query_intent, 
    rerank_context_chunks,
    save_chat_history,
)

router = APIRouter(prefix="/api/v1", tags=["Chat & Query"])

@router.post("/query")
async def query_rag(
    request: Request,
    body: RAGRequest,
    current_user: TokenClaims = Depends(get_current_user)
):
    org_id = current_user.org_id
    user_id = current_user.user_id
    if not org_id:
        raise HTTPException(status_code=403, detail="No organisation assigned.")

    current_session_id = body.session_id or f"session_{uuid.uuid4().hex[:12]}"
    base_url = str(request.base_url).rstrip("/")
    user_display_name = current_user.email.split("@")[0] if current_user.email else "user"

    # ── 1. Dynamic Decision: Classify whether documents are needed ──
    decision = classify_query_intent(body.query)
    needs_retrieval = decision.get("action") == "RETRIEVE"

    sources = []
    final_chunks = []

    # ── 2. Conditional Retrieval: Run only if RETRIEVE was chosen ──
    if needs_retrieval:
        query_embeddings = get_jina_embeddings([body.query], is_image=False)
        query_embedding = query_embeddings[0]

        candidate_k = max(body.top_k * 2, 10)
        retrieved_chunks = []

        if body.upload_mode == QueryMode.GLOBAL:
            retrieved_chunks = retrieve_global_neon(query_embedding, org_id, user_id, current_user.role.value, candidate_k)
        elif body.upload_mode == QueryMode.LOCAL:
            retrieved_chunks = retrieve_local_redis(query_embedding, user_id, org_id, candidate_k)
        elif body.upload_mode == QueryMode.BOTH:
            local_chunks = retrieve_local_redis(query_embedding, user_id, org_id, candidate_k)
            global_chunks = retrieve_global_neon(query_embedding, org_id, user_id, current_user.role.value, candidate_k)
            merged = local_chunks + global_chunks
            merged.sort(key=lambda x: x["similarity_score"], reverse=True)
            retrieved_chunks = merged[:body.top_k]

        final_chunks = rerank_context_chunks(body.query, retrieved_chunks, top_n=body.top_k)

        for c in final_chunks:
            if c["upload_mode"] == "global":
                doc_url = f"{base_url}/api/v1/documents/global/{c['document_id']}"
            else:
                doc_url = f"{base_url}/api/v1/documents/local/{c['document_id']}"

            if c["document_name"].lower().endswith(".pdf"):
                doc_url += f"#page={c['page_number']}"

            raw_chunk_text = c.get("text", "")
            is_image = isinstance(raw_chunk_text, str) and raw_chunk_text.startswith("data:image/")

            sources.append({
                "chunk_id": c["chunk_id"],
                "document_id": c["document_id"],
                "document_name": c["document_name"],
                "page_number": c["page_number"],
                "chunk_index": c["chunk_index"],
                "similarity_score": round(c["similarity_score"], 4),
                "text_preview": f"[Image Document: {c['document_name']}]" if is_image else raw_chunk_text,
                "org_id": c["org_id"],
                "upload_mode": c["upload_mode"],
                "document_url": doc_url,
                "image_data": raw_chunk_text if is_image else None,
                "is_image": is_image,
            })

    # ── 3. Streaming Response Generation ──
    async def generate_rag_response():
        try:
            

            full_answer = ""
            if needs_retrieval and final_chunks:
                # Document-grounded stream
                async for token in stream_llm_answer(
                    user_query=body.query,
                    context_chunks=final_chunks,
                    user_name=user_display_name,
                    language=body.language,
                    system_prompt=body.system_prompt
                ):
                    full_answer += token
                    yield f"data: {json.dumps({'event': 'token', 'data': token})}\n\n"
            else:
                # Direct LLM general stream
                async for token in stream_direct_answer(
                    user_query=body.query,
                    user_name=user_display_name,
                    language=body.language,
                    system_prompt=body.system_prompt
                ):
                    full_answer += token
                    yield f"data: {json.dumps({'event': 'token', 'data': token})}\n\n"

            # Send sources event: [] if direct, or citations list if document retrieval ran
            yield f"data: {json.dumps({'event': 'sources', 'data': sources})}\n\n"
            
            # ── 4. Save Chat History ──
            if body.upload_mode in [QueryMode.GLOBAL, QueryMode.BOTH]:
                sources_payload = [
                    {
                        "document_name": s.get("document_name", ""),
                        "page_number": s.get("page_number", 1),
                        "snippet": s.get("text_preview", ""),
                        "document_url": s.get("document_url", None),
                        "image_data": s.get("image_data", None),
                        "similarity_score": s.get("similarity_score", 0.0),
                    }
                    for s in sources
                ]
                save_chat_history(
                    user_id=user_id,
                    org_id=org_id,
                    query=body.query,
                    answer=full_answer,
                    query_mode=body.upload_mode.value,
                    session_id=current_session_id,
                    sources=sources_payload
                )

            yield f"data: {json.dumps({'event': 'done', 'session_id': current_session_id})}\n\n"
        except Exception as e:
            logger.error(f"Streaming error in generate_rag_response: {e}")
            yield f"data: {json.dumps({'event': 'error', 'data': f'LLM generation error: {e}'})}\n\n"

    return StreamingResponse(
        generate_rag_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.get("/chat/history")
async def get_chat_history(
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    current_user: TokenClaims = Depends(get_current_user)
):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    PAGE_SIZE = 10  # Strictly hardcoded server-side; user cannot alter this
    start = (page - 1) * PAGE_SIZE
    end = start + PAGE_SIZE - 1

    try:
        response = (
            supabase_client.table("chat_history")
            .select("*")
            .eq("user_id", current_user.user_id)
            .eq("org_id", current_user.org_id)
            .order("created_at", desc=True)
            .range(start,end)
            .execute()
        )
        total_count = response.count if response.count is not None else len(response.data)
        total_pages = (total_count + PAGE_SIZE - 1) // PAGE_SIZE if total_count > 0 else 1
        has_more = page < total_pages

        return {
            "history": response.data,
            "page": page,
            "limit": PAGE_SIZE,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_more": has_more,
        }
    except Exception as e:
        logger.error(f"Error fetching paginated chat history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {e}")
