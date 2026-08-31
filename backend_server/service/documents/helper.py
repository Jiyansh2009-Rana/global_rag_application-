import json
import base64
from typing import Tuple, Optional, Dict, Any
from fastapi import HTTPException
from core.database import supabase_client, redis_client

def get_global_document_record(doc_id: str) -> Optional[Dict[str, Any]]:
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client unavailable")
    response = supabase_client.table("document_registry").select("org_id, file_name").eq("id", doc_id).execute()
    if not response.data:
        return None
    return response.data[0]

def download_global_file(org_id: str, doc_id: str, filename: str) -> bytes:
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client unavailable")
    path = f"{org_id}/{doc_id}/{filename}"
    try:
        file_data = supabase_client.storage.from_("global_documents").download(path)
        return file_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading from storage: {e}")

def get_local_file(user_id: str, doc_id: str) -> Tuple[bytes, str]:
    if not redis_client:
        raise HTTPException(status_code=500, detail="Redis client unavailable")
    raw = redis_client.get(f"local_raw:{user_id}:{doc_id}")
    if not raw:
        raise HTTPException(status_code=404, detail="Local document not found or session expired")
    data = json.loads(raw)
    file_bytes = base64.b64decode(data["data"])
    filename = data["filename"]
    return file_bytes, filename
