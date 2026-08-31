from fastapi import APIRouter, HTTPException, Depends
from core.database import supabase_client
from core.security import RoleChecker
from service.common.models import Role, TokenClaims
from service.super_admin.helper import (
    delete_platform_user,
    delete_platform_document,
)

router = APIRouter(prefix="/api/v1/super-admin", tags=["Super Admin"])

super_admin_only = RoleChecker([Role.SUPER_ADMIN])

@router.get("/users")
async def super_admin_get_all_users(current_user: TokenClaims = Depends(super_admin_only)):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    try:
        response = (
            supabase_client.table("users")
            .select("id, email, role, org_id, created_at")
            .execute()
        )
        return {"users": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users globally: {e}")

@router.delete("/users/{target_user_id}")
async def super_admin_delete_user(
    target_user_id: str,
    current_user: TokenClaims = Depends(super_admin_only)
):
    if current_user.user_id == target_user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own Super Admin account.")

    delete_platform_user(target_user_id)
    return {"message": f"User {target_user_id} removed successfully from the platform."}

@router.get("/documents")
async def super_admin_get_all_documents(current_user: TokenClaims = Depends(super_admin_only)):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    try:
        response = supabase_client.table("document_registry").select("*").order("uploaded_at", desc=True).execute()
        return {"documents": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents globally: {e}")

@router.delete("/documents/{doc_id}")
async def super_admin_delete_document(
    doc_id: str,
    current_user: TokenClaims = Depends(super_admin_only)
):
    delete_platform_document(doc_id, current_user.user_id)
    return {"message": f"Document {doc_id} and all related chunks successfully deleted globally."}
