import json
import uuid
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse

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

    query_embeddings = get_jina_embeddings([body.query], is_image=False)
    query_embedding = query_embeddings[0]

    retrieved_chunks = []
    if body.upload_mode == QueryMode.GLOBAL:
        retrieved_chunks = retrieve_global_neon(query_embedding, org_id, user_id, current_user.role.value, body.top_k)
    elif body.upload_mode == QueryMode.LOCAL:
        retrieved_chunks = retrieve_local_redis(query_embedding, user_id, org_id, body.top_k)
    elif body.upload_mode == QueryMode.BOTH:
        local_chunks = retrieve_local_redis(query_embedding, user_id, org_id, body.top_k)
        global_chunks = retrieve_global_neon(query_embedding, org_id, user_id, current_user.role.value, body.top_k)
        merged = local_chunks + global_chunks
        merged.sort(key=lambda x: x["similarity_score"], reverse=True)
        retrieved_chunks = merged[:body.top_k]

    current_session_id = body.session_id or f"session_{uuid.uuid4().hex[:12]}"

    sources = []
    base_url = str(request.base_url).rstrip("/")

    for c in retrieved_chunks:
        if c["upload_mode"] == "global":
            doc_url = f"{base_url}/api/v1/documents/global/{c['document_id']}"
        else:
            doc_url = f"{base_url}/api/v1/documents/local/{c['document_id']}"

        if c["document_name"].lower().endswith(".pdf"):
            doc_url += f"#page={c['page_number']}"

        raw_chunk_text = c.get("text", "")
        is_image = isinstance(raw_chunk_text, str) and raw_chunk_text.startswith("data:image/")

        if is_image:
            preview_text = f"[Image Document: {c['document_name']}]"
            image_data = raw_chunk_text
        else:
            preview_text = raw_chunk_text[:len(raw_chunk_text)]
            image_data = None

        sources.append({
            "chunk_id": c["chunk_id"],
            "document_id": c["document_id"],
            "document_name": c["document_name"],
            "page_number": c["page_number"],
            "chunk_index": c["chunk_index"],
            "similarity_score": round(c["similarity_score"], 4),
            "text_preview": preview_text,
            "org_id": c["org_id"],
            "upload_mode": c["upload_mode"],
            "document_url": doc_url,
            "image_data": image_data,
            "is_image": is_image,
        })

    async def generate_rag_response():
        # First send the sources event
        yield f"data: {json.dumps({'event': 'sources', 'data': sources})}\n\n"

        full_answer = ""
        async for token in stream_llm_answer(body.query, retrieved_chunks, body.language, body.system_prompt):
            full_answer += token
            yield f"data: {json.dumps({'event': 'token', 'data': token})}\n\n"

        if body.upload_mode in [QueryMode.GLOBAL, QueryMode.BOTH]:
            save_chat_history(user_id, org_id, body.query, full_answer, body.upload_mode.value, current_session_id)

        yield f"data: {json.dumps({'event': 'done', 'session_id': current_session_id})}\n\n"

    return StreamingResponse(generate_rag_response(), media_type="text/event-stream")

@router.get("/chat/history")
async def get_chat_history(
    current_user: TokenClaims = Depends(get_current_user)
):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    try:
        response = (
            supabase_client.table("chat_history")
            .select("*")
            .eq("user_id", current_user.user_id)
            .eq("org_id", current_user.org_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"history": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chat history: {e}")
