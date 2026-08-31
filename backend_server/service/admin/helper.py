import logging
from datetime import datetime, timezone
from fastapi import HTTPException
from core.database import get_neon_connection, supabase_client, redis_client

logger = logging.getLogger(__name__)

def check_org_global_upload_setting(org_id: str) -> bool:
    if not supabase_client:
        return False
    try:
        response = (
            supabase_client.table("organization_settings")
            .select("allow_user_global_upload")
            .eq("org_id", org_id)
            .execute()
        )
        if response.data:
            return response.data[0].get("allow_user_global_upload", False)
    except Exception as e:
        logger.error(f"Error checking org settings: {e}")
    return False

def update_org_global_upload_setting(org_id: str, allow_upload: bool) -> None:
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")
    try:
        supabase_client.table("organization_settings").upsert({
            "org_id": org_id,
            "allow_user_global_upload": allow_upload,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update global upload settings: {e}")

def delete_org_user_record(target_user_id: str, org_id: str, current_role: str = "Admin") -> None:
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    user_check = supabase_client.table("users").select("id, org_id").eq("id", target_user_id).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found.")

    if current_role != "Super Admin" and user_check.data[0]["org_id"] != org_id:
        raise HTTPException(status_code=403, detail="Access denied: User belongs to another organization.")

    supabase_client.table("users").delete().eq("id", target_user_id).execute()

    if redis_client:
        try:
            redis_client.delete(f"user:{target_user_id}:meta")
        except Exception:
            pass

def delete_org_document_data(doc_id: str, org_id: str, current_user_id: str, current_role: str = "Admin") -> None:
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    doc_check = supabase_client.table("document_registry").select("id, org_id, file_name").eq("id", doc_id).execute()
    if not doc_check.data:
        raise HTTPException(status_code=404, detail="Document not found.")

    target_doc = doc_check.data[0]
    doc_org_id = target_doc["org_id"]
    doc_filename = target_doc.get("file_name", "")

    if current_role != "Super Admin" and doc_org_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied: Document belongs to another organization.")

    # 1. Delete vector chunks from Neon PostgreSQL
    conn = get_neon_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT set_config('app.current_org_id', %s, true)", (doc_org_id,))
                cur.execute("SELECT set_config('app.current_user_id', %s, true)", (current_user_id,))
                cur.execute("SELECT set_config('app.current_role', %s, true)", (current_role,))
                cur.execute(
                    "DELETE FROM document_chunks WHERE document_id = %s",
                    (doc_id,)
                )
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to delete document chunks from Neon: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete document chunks from DB: {e}")
        finally:
            conn.close()

    # 2. Delete page registry and document registry entries in Supabase
    try:
        supabase_client.table("page_registry").delete().eq("document_id", doc_id).execute()
        supabase_client.table("document_registry").delete().eq("id", doc_id).execute()
    except Exception as e:
        logger.error(f"Failed to clear document registry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear document registry: {e}")

    # 3. Clean up raw file from Supabase Storage
    if doc_filename and supabase_client:
        try:
            storage_path = f"{doc_org_id}/{doc_id}/{doc_filename}"
            supabase_client.storage.from_("global_documents").remove([storage_path])
        except Exception as e:
            logger.warning(f"Could not remove file from storage: {e}")

    # 4. Write audit log
    try:
        supabase_client.table("audit_log").insert({
            "event_type": "global_document_deleted",
            "user_id": current_user_id,
            "org_id": doc_org_id,
            "doc_id": doc_id,
            "file_name": doc_filename,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        logger.warning(f"Audit log write failed: {e}")
