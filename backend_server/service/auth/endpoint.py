from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Response, Depends, Cookie
from core.config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
from core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_jwt_token,      
    get_current_user,
)
from service.common.models import (
    Role,
    UserSignup,
    UserLogin,
    VerifySignupRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserInfo,
    TokenClaims,
)
from service.auth.helper import (
    check_existing_user,
    initiate_signup_otp,
    verify_signup_otp,
    fetch_user_by_email,
    initiate_forgot_password,
    reset_user_password,
    blacklist_user_session,
)
from core.database import supabase_client

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: UserSignup):
    if check_existing_user(payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return initiate_signup_otp(payload)

@router.post("/verify-signup", status_code=status.HTTP_201_CREATED)
async def verify_signup(payload: VerifySignupRequest):
    return verify_signup_otp(payload.email, payload.otp)

@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    return initiate_forgot_password(payload.email)

@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    return reset_user_password(payload.email, payload.otp, payload.new_password)

@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, response: Response):
    user = fetch_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is inactive.")
    if user.get("role") != "Super Admin" and user.get("org_id"):
        if supabase_client:
            org_check = (
                supabase_client.table("organization_settings")
                .select("is_disabled, disabled_reason")
                .eq("org_id", user["org_id"])
                .execute()
            )
            if org_check.data and org_check.data[0].get("is_disabled"):
                reason = org_check.data[0].get("disabled_reason") or "Please contact your Super Administrator."
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Your organisation '{user['org_id']}' has been suspended. Reason: {reason}"
                )
    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        username=user.get("username"),
        role=Role(user["role"]),
        org_id=user.get("org_id"),
        allow_global_upload=user.get("allow_global_upload", False),
    )
    refresh_token = create_refresh_token(user_id=user["id"], org_id=user.get("org_id"))
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/api/v1/auth",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    return TokenResponse(
        access_token=token,
        role=user["role"],
        org_id=user.get("org_id"),
    )

@router.post("/refresh")
async def refresh(response: Response, refresh_token: Optional[str] = Cookie(None, alias="refresh_token")):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing.")
    payload = decode_jwt_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token.")
    user_id = payload.get("sub")
    if not supabase_client or not user_id:
        raise HTTPException(status_code=500, detail="Database connection error.")
    res = supabase_client.table("users").select("id, email, username, org_id, role, allow_global_upload, is_active").eq("id", user_id).execute()
    if not res.data or not res.data[0].get("is_active", True):
        raise HTTPException(status_code=401, detail="User account inactive or missing.")
    u = res.data[0]
    new_token = create_access_token(
        user_id=u["id"],
        email=u["email"],
        username=u.get("username"),
        role=Role(u.get("role", "User")),
        org_id=u.get("org_id"),
        allow_global_upload=bool(u.get("allow_global_upload", False)),
    )
    response.set_cookie(
        key="access_token",
        value=new_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }

@router.post("/logout")
async def logout(response: Response, current_user: TokenClaims = Depends(get_current_user)):
    blacklist_user_session(current_user.user_id, current_user.exp)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token", path="/api/v1/auth")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserInfo)
async def get_me(current_user: TokenClaims = Depends(get_current_user)):
    if supabase_client:
        res = (
            supabase_client.table("users")
            .select("id, username, email, role, org_id, allow_global_upload, created_at")
            .eq("id", current_user.user_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=401, detail="User no longer exists.")
        u = res.data[0]
        return UserInfo(
            user_id=u["id"],
            username=u.get("username") or u["email"].split("@")[0],
            email=u["email"],
            role=Role(u["role"]),
            org_id=u.get("org_id"),
            allow_global_upload=bool(u.get("allow_global_upload", False)),
            created_at=u.get("created_at") or datetime.now(timezone.utc).isoformat(),
        )
    return UserInfo(
        user_id=current_user.user_id,
        username=current_user.username or current_user.email.split("@")[0],
        email=current_user.email,
        role=current_user.role,
        org_id=current_user.org_id,
        allow_global_upload=bool(current_user.allow_global_upload),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
