from typing import Optional , Dict, Any
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
    GoogleOAuthExchangeRequest,
    GoogleAuthUrlResponse,
)
from service.auth.helper import (
    check_existing_user,
    initiate_signup_otp,
    verify_signup_otp,
    fetch_user_by_email,
    initiate_forgot_password,
    reset_user_password,
    blacklist_user_session,
    construct_google_authorization_url,
    exchange_authorization_code_for_google_tokens,
    retrieve_google_user_profile,
    resolve_or_register_oauth_user,
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
        secure=True,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
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

# STEP 1 & 2: USER INITIATES ACCESS -> REDIRECT TO GOOGLE AUTHORIZATION SERVER
# ============================================================================
@router.get("/google/authorize-url", response_model=GoogleAuthUrlResponse)
async def get_google_authorization_url(redirect_uri: Optional[str] = None):
    """
    Returns the Google consent URL. The frontend redirects the user's browser here.
    """
    target_authorization_url = construct_google_authorization_url(
        custom_redirect_uri=redirect_uri
    )
    return GoogleAuthUrlResponse(authorization_url=target_authorization_url)

# STEPS 4, 5, 6, 7: RECEIVE CODE, ISSUE TOKEN, ACCESS RESOURCES, LOGIN/SIGNUP
# ============================================================================
@router.post("/google/exchange", response_model=TokenResponse)
async def exchange_google_authorization_code(
    payload: GoogleOAuthExchangeRequest,
    response: Response
):
    """
    Executes the OAuth 2.0 Authorization Code exchange:
    1. Sends the authorization code + client credentials to Google Token Server.
    2. Receives the Google access token (temporary key with scope & expiry).
    3. Accesses Google's Resource Server (UserInfo) with the access token.
    4. Automatically logs in existing user or registers a new user.
    5. Checks tenant organization suspension policy.
    6. Issues Askmydocsai JWT cookies (access_token, refresh_token).
    """
    # Step 4 & 5: Exchange authorization code for Google access token
    google_tokens: Dict[str, Any] = await exchange_authorization_code_for_google_tokens(
        authorization_code=payload.authorization_code,
        registered_redirect_uri=payload.redirect_uri,
    )
    google_access_token: str = google_tokens.get("access_token", "")
    # Step 6: Present access token to Google Resource Server
    google_user_profile: Dict[str, Any] = await retrieve_google_user_profile(
        google_access_token=google_access_token
    )
    # Step 7: Match existing user (Login) or auto-register new user (Sign Up)
    authenticated_user_record: Dict[str, Any] = resolve_or_register_oauth_user(
        google_profile=google_user_profile,
        requested_organization_id=payload.organization_identifier,
    )
    user_identifier: str = authenticated_user_record["id"]
    user_email_address: str = authenticated_user_record["email"]
    user_account_role: str = authenticated_user_record["role"]
    assigned_organization_id: Optional[str] = authenticated_user_record.get("org_id")
    has_global_upload_permission: bool = authenticated_user_record.get("allow_global_upload", False)
    # Tenant Governance Enforcement: Ensure organization is not disabled
    if user_account_role != "Super Admin" and assigned_organization_id and supabase_client:
        organization_status_query = (
            supabase_client.table("organization_settings")
            .select("is_disabled, disabled_reason")
            .eq("org_id", assigned_organization_id)
            .execute()
        )
        if organization_status_query.data and organization_status_query.data[0].get("is_disabled"):
            suspension_reason = (
                organization_status_query.data[0].get("disabled_reason")
                or "Please contact your Super Administrator."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Organisation '{assigned_organization_id}' is suspended. Reason: {suspension_reason}"
            )
    # Issue platform JWT tokens
    platform_access_token: str = create_access_token(
        user_id=user_identifier,
        email=user_email_address,
        username=authenticated_user_record.get("username"),
        role=Role(user_account_role),
        org_id=assigned_organization_id,
        allow_global_upload=has_global_upload_permission,
    )
    platform_refresh_token: str = create_refresh_token(
        user_id=user_identifier,
        org_id=assigned_organization_id
    )
    # Set secure, HTTP-only session cookies
    response.set_cookie(
        key="access_token",
        value=platform_access_token,
        httponly=True,
        secure=True,  # Set to True in HTTPS production environments
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=platform_refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/api/v1/auth",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )
    return TokenResponse(
        access_token=platform_access_token,
        role=Role(user_account_role),
        org_id=assigned_organization_id,
    )