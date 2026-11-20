import logging
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from psycopg2.extras import RealDictCursor
from fastapi import HTTPException
import groq
import requests
from core.config import JINA_API_KEY

from core.database import get_neon_connection, supabase_client, redis_client, groq_client

logger = logging.getLogger(__name__)

def get_doc_name_from_registry(document_id: str) -> str:
    if not supabase_client:
        return document_id
    try:
        result = (
            supabase_client.table("document_registry")
            .select("file_name")
            .eq("id", document_id)
            .execute()
        )
        if result.data:
            return result.data[0]["file_name"]
    except Exception:
        pass
    return document_id

def get_verified_doc_metadata(document_id: str, org_id: str) -> Optional[str]:
    """
    Saga Gatekeeper:
    Checks Supabase document_registry. Only documents with status == 'ready'
    are permitted into RAG query context. Returns the filename if valid, None if invalid.
    """
    if not supabase_client:
        return None
    try:
        res = (
            supabase_client.table("document_registry")
            .select("file_name, status")
            .eq("id", document_id)
            .eq("org_id", org_id)
            .execute()
        )
        if res.data and res.data[0].get("status") == "ready":
            return res.data[0]["file_name"]
        else:
            logger.warning(f"[Gatekeeper] Discarding unverified doc {document_id} (status: {res.data[0].get('status') if res.data else 'not_found'})")
            return None
    except Exception as e:
        logger.error(f"[Gatekeeper] Registry lookup error for doc {document_id}: {e}")
        return None

def retrieve_global_neon(
    query_embedding: List[float],
    org_id: str,
    user_id: str,
    role: str,
    top_k: int = 5,
    match_threshold: float = 0.2
) -> List[Dict[str, Any]]:
    conn = get_neon_connection()
    if not conn:
        logger.warning("Neon connection unavailable for global retrieval.")
        return []

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT set_config('app.current_org_id', %s, true)", (org_id,))
            cur.execute("SELECT set_config('app.current_user_id', %s, true)", (user_id,))
            cur.execute("SELECT set_config('app.current_role', %s, true)", (role,))

            cur.execute(
                """
                SELECT
                    id   AS chunk_id,
                    document_id,
                    org_id,
                    page_number,
                    chunk_index,
                    text,
                    upload_mode,
                    1 - (embedding <=> %s::vector) AS similarity_score
                FROM document_chunks
                WHERE org_id = %s
                  AND 1 - (embedding <=> %s::vector) >= %s
                ORDER BY similarity_score DESC
                LIMIT %s
                """,
                (query_embedding, org_id, query_embedding, match_threshold, top_k)
            )
            rows = cur.fetchall()

        results = []    
        for row in rows:
            doc_name = get_verified_doc_metadata(row["document_id"], org_id)
            if not doc_name:
                # Discard orphan chunk from uncompleted/failed document
                logger.info(f"[RAG Protection] Filtered out unverified chunk {row['id']} from doc {row['document_id']}")
                continue
            results.append({
                "chunk_id":         row["chunk_id"],
                "document_id":      row["document_id"],
                "document_name":    doc_name,
                "org_id":           row["org_id"],
                "page_number":      row["page_number"],
                "chunk_index":      row["chunk_index"],
                "text":             row["text"],
                "similarity_score": float(row["similarity_score"]),
                "upload_mode":      row["upload_mode"],
            })
        return results

    except Exception as e:
        logger.error(f"Neon retrieval error: {e}")
        return []
    finally:
        conn.close()

def retrieve_local_redis(
    query_embedding: List[float],
    user_id: str,
    org_id: str,
    top_k: int = 5,
    match_threshold: float = 0.10
) -> List[Dict[str, Any]]:
    if not redis_client:
        logger.warning("Redis unavailable for local retrieval.")
        return []
    try:
        chunk_keys = redis_client.keys(f"local:{user_id}:*:chunk:*")
        if not chunk_keys:
            return []
        scored: List[tuple] = []
        for key in chunk_keys:
            raw = redis_client.get(key)
            if not raw:
                continue
            item = json.loads(raw)
            if item.get("org_id") != org_id:
                continue
            stored_emb = item.get("embedding", [])
            if not stored_emb:
                continue
            score = sum(a * b for a, b in zip(query_embedding, stored_emb))
            if score >= match_threshold:
                scored.append((score, item))
        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:top_k]
        results = []
        for score, item in top:
            results.append({
                "chunk_id": item.get("chunk_id", ""),
                "document_id": item.get("doc_id", ""),
                "document_name": item.get("file_name", "unknown"),
                "org_id": item.get("org_id", ""),
                "page_number": item.get("page_number", 0),
                "chunk_index": item.get("chunk_index", 0),
                "text": item.get("text", ""),
                "similarity_score": float(score),
                "upload_mode": "local",
            })
        return results
    except Exception as e:
        logger.error(f"Redis retrieval error: {e}")
        return []

LANGUAGE_INSTRUCTION = {
    "English":    "Answer in English.",
    "Hindi":      "हिंदी में उत्तर दें।",
    "French":     "Répondez en français.",
    "German":     "Antworten Sie auf Deutsch.",
    "Spanish":    "Responde en español.",
    "Arabic":     "أجب باللغة العربية.",
    "Chinese":    "用中文回答。",
    "Japanese":   "日本語で答えてください。",
}

DEFAULT_SYSTEM_PROMPT = """You are an intelligent document assistant for an enterprise RAG platform.
Answer the user's question using ONLY the context provided below.
If the context does not contain enough information, say so clearly.
Do not fabricate or hallucinate any information not present in the context.
Be concise, accurate, and professional but if you not find any answer in vector base or If  context have not contain enough information then give answer according to your knowledg base and training data .
"""
async def stream_llm_answer(
    user_query: str,
    context_chunks: List[Dict[str, Any]],
    user_name: str ="user",
    language: str = "English",
    system_prompt: Optional[str] = None,
):
    if not context_chunks:
        yield (
            "I could not find relevant information in the available documents. "
            "Please try rephrasing or upload relevant documents."
        )
        return
    user_identity_prompt = (
        f"You are speaking with {user_name}. "
        f"If the user greets you or asks for their name/identity, address them warmly as {user_name}."
    )

    context_parts = []
    for i, chunk in enumerate(context_chunks, start=1):
        chunk_text = chunk.get("text", "")
        if isinstance(chunk_text, str) and chunk_text.startswith("data:image/"):
            context_parts.append(
                f"[Source {i} | Image Document: {chunk['document_name']}]\n"
                f"The image document '{chunk['document_name']}' was matched via multimodal embedding. "
                f"Inform the user that the image has been found and is available for preview and download in the citations."
            )
        else:
            context_parts.append(
                f"[Source {i} | {chunk['document_name']} | Page {chunk['page_number']}]\n{chunk_text}"
            )

    context_text = "\n\n---\n\n".join(context_parts)
    lang_instruction = LANGUAGE_INSTRUCTION.get(language, "Answer in English.")
    base_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
    full_system = (
        f"{base_prompt}\n\n"
        f"User Identity: {user_identity_prompt}\n"
        f"Language instruction: {LANGUAGE_INSTRUCTION.get(language, 'Answer in English.')}\n\n"
        f"Context from documents:\n{context_text}"
    )

    models_to_try = [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "allam-2-7b",
        "meta-llama/llama-prompt-guard-2-86m"
    ]

    stream = None

    for model_name in models_to_try:
        try:
            stream = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": full_system},
                    {"role": "user", "content": user_query},
                ],
                temperature=0.3,
                stream=True,
            )
            break
        except groq.RateLimitError as e:
            logger.warning(f"Token/Rate limit hit for {model_name}. Switching model... Error: {e}")
            continue
        except Exception as e:
            logger.warning(f"Error connecting to {model_name}. Switching model... Error: {e}")
            continue

    if not stream:
        raise HTTPException(
            status_code=502,
            detail="All LLM models failed or hit their token limits. Please try again later."
        )

    try:
        for chunk in stream:
            token = chunk.choices[0].delta.content
            if token:
                yield token
    except Exception as e:
        logger.error(f"Stream iteration interrupted: {e}")
        yield f"\n\n[Generation interrupted: {e}]"

def save_chat_history(user_id: str, org_id: str, query: str, answer: str, query_mode: str, session_id: str, sources: Optional[list] = None) -> None:
    if not supabase_client:
        return
    payload = {
        "user_id": user_id,
        "session_id": session_id,
        "org_id": org_id,
        "query": query,
        "answer": answer,
        "query_mode": query_mode,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if sources is not None:
        payload["sources"] = sources
    try:
        supabase_client.table("chat_history").insert(payload).execute()
    except Exception as e:
        logger.error(f"Failed to save chat history: {e}")

def log_query_event(
    user_id: str, org_id: str, query: str,
    query_mode: str, sources_found: int, ip_address: str
) -> None:
    if not supabase_client:
        return
    try:
        supabase_client.table("audit_log").insert({
            "event_type":    "rag_query",
            "user_id":       user_id,
            "org_id":        org_id,
            "query_text":    query[:500],
            "query_mode":    query_mode,
            "sources_found": sources_found,
            "ip_address":    ip_address,
            "timestamp":     datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        logger.error(f"Query audit log failed: {e}")

def rerank_context_chunks(
    query_text: str,
    chunks: List[Dict[str, Any]],
    top_n: int = 5
) -> List[Dict[str, Any]]:
    """
    Reranks retrieved context chunks down to top_n using Jina Reranker v3.
    Matches Lambda 6 implementation from serverless-rag.
    """
    if not chunks:
        return []

    # If already fewer or equal to desired top_n, no need to rerank
    if len(chunks) <= top_n:
        return chunks

    if not JINA_API_KEY or JINA_API_KEY.startswith("your-"):
        logger.warning("JINA_API_KEY not configured. Skipping reranking.")
        return chunks[:top_n]

    url = "https://api.jina.ai/v1/rerank"
    headers = {
        "Authorization": f"Bearer {JINA_API_KEY}",
        "Content-Type": "application/json"
    }

    # For multimodal image chunks, use filename description to avoid sending huge base64 strings
    doc_texts = [
        f"Image document: {c.get('document_name', '')}"
        if isinstance(c.get("text", ""), str) and c.get("text", "").startswith("data:image/")
        else c.get("text", "")
        for c in chunks
    ]

    payload = {
        "model": "jina-reranker-v3",
        "query": query_text,
        "documents": doc_texts,
        "top_n": top_n
    }

    try:
        res = requests.post(url, json=payload, headers=headers, timeout=15)
        res.raise_for_status()
        reranked_data = res.json().get("results", [])

        reranked_chunks = []
        for item in reranked_data:
            idx = item["index"]
            chunk = chunks[idx].copy()
            relevance = float(item.get("relevance_score", chunk.get("similarity_score", 0.0)))
            chunk["rerank_score"] = relevance
            chunk["similarity_score"] = relevance
            reranked_chunks.append(chunk)

        return reranked_chunks
    except Exception as e:
        logger.error(f"Jina Reranker v3 error: {e}. Falling back to top {top_n} similarity results.")
        return chunks[:top_n]
ROUTER_SYSTEM_PROMPT = """You are an intelligent query routing agent for an enterprise document RAG assistant.
Determine whether the user query requires retrieving information from private uploaded documents, or if it can be directly answered using general intelligence.
Classify the query into:
- "RETRIEVE": The user is asking about specific documents, files, contracts, uploaded reports, numerical tables, policy documents, or organization-specific data that exists in uploaded files.
- "DIRECT": Greetings ("hi", "hello"), general chit-chat, programming/math questions, generic definitions, common knowledge, or questions that do not reference or need private documents.
Respond ONLY with a valid JSON object matching this schema:
{"action": "RETRIEVE" | "DIRECT", "reason": "brief reason"}
"""
def classify_query_intent(user_query: str) -> Dict[str, Any]:
    """
    Ultra-fast LLM classifier on Groq to determine whether to perform RAG retrieval or answer directly.
    Defaults to RETRIEVE on any error to ensure safe behavior.
    """
    if not groq_client:
        return {"action": "RETRIEVE", "reason": "groq client unavailable"}
    # Obvious instant bypass for simple greetings
    q_clean = user_query.strip().lower()
    if q_clean in ["hi", "hello", "hey", "who are you?", "who are you", "help", "good morning", "good evening"]:
        return {"action": "DIRECT", "reason": "simple greeting"}
    try:
        response = groq_client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[
                {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
                {"role": "user", "content": user_query}
            ],
            temperature=0.0,
            max_tokens=60,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        action = data.get("action", "RETRIEVE").upper()
        if action not in ["RETRIEVE", "DIRECT"]:
            action = "RETRIEVE"
        return {"action": action, "reason": data.get("reason", "")}
    except Exception as e:
        logger.warning(f"Query classification failed, defaulting to RETRIEVE: {e}")
        return {"action": "RETRIEVE", "reason": "fallback"}

async def stream_direct_answer(
    user_query: str,
    user_name: str = "user",
    language: str = "English",
    system_prompt: Optional[str] = None,
):
    """Streams conversational or general knowledge answers directly without vector context."""
    user_identity = f"You are speaking with {user_name}."
    lang_instruction = LANGUAGE_INSTRUCTION.get(language, "Answer in English.")
    base_prompt = system_prompt or "You are an intelligent enterprise AI assistant. Be helpful, professional, and accurate."
    full_system = f"{base_prompt}\n\n{user_identity}\n\nLanguage instruction: {lang_instruction}"
    models_to_try = [
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "allam-2-7b",
    ]
    stream = None
    for model_name in models_to_try:
        try:
            stream = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": full_system},
                    {"role": "user", "content": user_query},
                ],
                temperature=0.5,
                stream=True,
            )
            break
        except Exception as e:
            logger.warning(f"Error connecting to {model_name} for direct answer: {e}")
            continue
    if not stream:
        raise HTTPException(status_code=502, detail="LLM service temporarily unavailable.")
    for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            yield token