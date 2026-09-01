from fastapi import APIRouter, HTTPException, Depends
from core.database import supabase_client
from core.security import RoleChecker
from service.common.models import (
    Role,
    TokenClaims,
    OrgSettingsResponse,
    OrgSettingsUpdate,
    UserPermissionUpdate,
)
from service.admin.helper import (
    check_org_global_upload_setting,
    update_org_global_upload_setting,
    delete_org_user_record,
    delete_org_document_data,
)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])

admin_only = RoleChecker([Role.ADMIN, Role.SUPER_ADMIN])
any_auth_user = RoleChecker([Role.USER, Role.ADMIN, Role.SUPER_ADMIN])

@router.get("/users")
async def get_organization_users(current_user: TokenClaims = Depends(admin_only)):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    try:
        query = supabase_client.table("users").select("id, username, email, role, org_id, allow_global_upload, created_at")
        if current_user.org_id:
            query = query.eq("org_id", current_user.org_id)
        response = query.order("created_at", desc=True).execute()
        return {"users": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch users: {e}")

@router.get("/settings/global-upload", response_model=OrgSettingsResponse)
async def get_global_upload_setting(current_user: TokenClaims = Depends(any_auth_user)):
    is_allowed = check_org_global_upload_setting(current_user.org_id or "")
    return OrgSettingsResponse(
        org_id=current_user.org_id or "",
        allow_user_global_upload=is_allowed
    )

@router.post("/settings/global-upload")
async def configure_global_upload(
    payload: OrgSettingsUpdate,
    current_user: TokenClaims = Depends(admin_only)
):
    update_org_global_upload_setting(current_user.org_id or "", payload.allow_user_global_upload)
    return {
        "message": "Global upload configuration updated successfully.",
        "allow_user_global_upload": payload.allow_user_global_upload
    }

@router.patch("/users/{target_user_id}/permissions")
async def update_user_upload_permission(
    target_user_id: str,
    payload: UserPermissionUpdate,
    current_user: TokenClaims = Depends(admin_only)
):
    # Verify user belongs to same org
    user_check = supabase_client.table("users").select("id, org_id").eq("id", target_user_id).execute()
    if not user_check.data:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if current_user.role != Role.SUPER_ADMIN and user_check.data[0]["org_id"] != current_user.org_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    supabase_client.table("users").update({
        "allow_global_upload": payload.allow_global_upload
    }).eq("id", target_user_id).execute()

    return {
        "message": f"Global upload permission {'enabled' if payload.allow_global_upload else 'disabled'}.",
        "user_id": target_user_id,
        "allow_global_upload": payload.allow_global_upload
    }


@router.delete("/users/{target_user_id}")
async def delete_organization_user(
    target_user_id: str,
    current_user: TokenClaims = Depends(admin_only)
):
    if current_user.user_id == target_user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")

    delete_org_user_record(target_user_id, current_user.org_id or "", current_user.role.value)
    return {"message": f"User {target_user_id} removed successfully."}

@router.get("/documents")
async def get_organization_documents(current_user: TokenClaims = Depends(admin_only)):
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    try:
        query = supabase_client.table("document_registry").select("*")
        if current_user.org_id:
            query = query.eq("org_id", current_user.org_id)
        response = query.order("uploaded_at", desc=True).execute()
        return {"documents": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch documents: {e}")

@router.delete("/documents/{doc_id}")
async def delete_organization_document(
    doc_id: str,
    current_user: TokenClaims = Depends(admin_only)
):
    delete_org_document_data(doc_id, current_user.org_id or "", current_user.user_id, current_user.role.value)
    return {"message": f"Document {doc_id} and all related chunks successfully deleted."}
