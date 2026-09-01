import logging
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks

from core.database import supabase_client
from core.security import RoleChecker
from service.common.models import Role, TokenClaims
from service.super_admin.helper import (
    delete_platform_user,
    delete_platform_document,
)
from service.common.email_service import send_organization_disabled_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/super-admin", tags=["Super Admin"])

super_admin_only = RoleChecker([Role.SUPER_ADMIN])


class OrgStatusToggle(BaseModel):
    is_disabled: bool
    reason: Optional[str] = "Administrative policy decision"




@router.get("/organizations")
async def super_admin_get_all_organizations(current_user: TokenClaims = Depends(super_admin_only)):
    """List all organizations with their admin email, user count, and active/disabled status."""
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    try:
        users_res = supabase_client.table("users").select("id, email, role, org_id").execute()
        all_users = users_res.data or []

        settings_res = supabase_client.table("organization_settings").select("*").execute()
        settings_map = {s["org_id"]: s for s in (settings_res.data or [])}

        orgs_dict = {}
        for u in all_users:
            org = u.get("org_id")
            if not org:
                continue
            if org not in orgs_dict:
                setting = settings_map.get(org, {})
                orgs_dict[org] = {
                    "org_id": org,
                    "admin_email": None,
                    "total_users": 0,
                    "is_disabled": setting.get("is_disabled", False),
                    "disabled_at": setting.get("disabled_at"),
                    "disabled_reason": setting.get("disabled_reason"),
                }
            orgs_dict[org]["total_users"] += 1
            if u.get("role") in ["Admin", "Super Admin"] and not orgs_dict[org]["admin_email"]:
                orgs_dict[org]["admin_email"] = u.get("email")

        return {"organizations": list(orgs_dict.values())}
    except Exception as e:
        logger.error(f"Failed to fetch organisations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch organisations: {e}")


@router.post("/organizations/{org_id}/toggle-status")
async def super_admin_toggle_org_status(
    org_id: str,
    payload: OrgStatusToggle,
    background_tasks: BackgroundTasks,
    current_user: TokenClaims = Depends(super_admin_only)
):
    """Disable or Activate an organization's access and automatically send an email to the Org Admin."""
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase client not initialized")

    try:
        # Find Org Admin Email
        admin_res = (
            supabase_client.table("users")
            .select("email")
            .eq("org_id", org_id)
            .in_("role", ["Admin",])
            .limit(1)
            .execute()
        )
        admin_email = admin_res.data[0]["email"] if admin_res.data else None

        # Upsert organization status
        supabase_client.table("organization_settings").upsert({
            "org_id": org_id,
            "is_disabled": payload.is_disabled,
            "disabled_at": datetime.now(timezone.utc).isoformat() if payload.is_disabled else None,
            "disabled_reason": payload.reason if payload.is_disabled else None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        # Audit Log
        supabase_client.table("audit_log").insert({
            "event_type": "organization_disabled" if payload.is_disabled else "organization_enabled",
            "user_id": current_user.user_id,
            "org_id": org_id,
            "role": current_user.role.value,
            "note": f"Org Admin: {admin_email}. Reason: {payload.reason}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }).execute()

        # Auto-send email notification in background when disabled
        if payload.is_disabled and admin_email:
            background_tasks.add_task(
                send_organization_disabled_email,
                admin_email=admin_email,
                org_id=org_id,
                reason=payload.reason
            )

        return {
            "message": f"Organisation '{org_id}' access has been {'DISABLED' if payload.is_disabled else 'ACTIVATED'}.",
            "org_id": org_id,
            "admin_email": admin_email,
            "is_disabled": payload.is_disabled,
            "email_sent": bool(payload.is_disabled and admin_email)
        }
    except Exception as e:
        logger.error(f"Failed to update org status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update org status: {e}")



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