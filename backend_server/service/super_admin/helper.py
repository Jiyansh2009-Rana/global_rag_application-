from datetime import datetime, timezone
import logging
from fastapi import HTTPException
from core.database import get_neon_connection, supabase_client, redis_client

logger = logging.getLogger(__name__)

def delete_platform_user(target_user_id: str) -> None:
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    supabase_client.table("users").delete().eq("id", target_user_id).execute()

    if redis_client:
        try:
            redis_client.delete(f"user:{target_user_id}:meta")
        except Exception:
            pass

def delete_platform_document(doc_id: str, current_user_id: str) -> None:
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    doc_check = supabase_client.table("document_registry").select("id, org_id, file_name").eq("id", doc_id).execute()
    if not doc_check.data:
        raise HTTPException(status_code=404, detail="Document not found on the platform.")

    target_doc = doc_check.data[0]
    target_org_id = target_doc["org_id"]
    target_filename = target_doc.get("file_name", "")

    # 1. Delete from Neon
    conn = get_neon_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT set_config('app.current_org_id', %s, true)", (target_org_id,))
                cur.execute("SELECT set_config('app.current_user_id', %s, true)", (current_user_id,))
                cur.execute("SELECT set_config('app.current_role', %s, true)", ("Super Admin",))
                cur.execute("DELETE FROM document_chunks WHERE document_id = %s", (doc_id,))
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Failed to delete document chunks from DB: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete document chunks globally from DB: {e}")
        finally:
            conn.close()

    # 2. Delete from Supabase tables
    try:
        supabase_client.table("page_registry").delete().eq("document_id", doc_id).execute()
        supabase_client.table("document_registry").delete().eq("id", doc_id).execute()
    except Exception as e:
        logger.error(f"Failed to clear document registry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear document registry globally: {e}")

    # 3. Clean up Supabase Storage
    if target_filename and supabase_client:
        try:
            storage_path = f"{target_org_id}/{doc_id}/{target_filename}"
            supabase_client.storage.from_("global_documents").remove([storage_path])
        except Exception as e:
            logger.warning(f"Could not remove file from storage: {e}")

    # 4. Audit log
    try:
        supabase_client.table("audit_log").insert({
            "event_type": "super_admin_global_document_deleted",
            "user_id": current_user_id,
            "org_id": target_org_id,
            "doc_id": doc_id,
            "file_name": target_filename,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        logger.warning(f"Super admin audit log failed: {e}")
