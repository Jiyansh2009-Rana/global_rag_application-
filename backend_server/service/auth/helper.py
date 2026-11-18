import logging
import json
import httpx
import uuid
import secrets
import string
import hmac
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException,status
from urllib.parse import urlencode
from core.config import (
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_AUTHORIZATION_ENDPOINT,
    GOOGLE_TOKEN_EXCHANGE_ENDPOINT,
    GOOGLE_USERINFO_RESOURCE_ENDPOINT,
    GOOGLE_REDIRECT_URI,
    OTP_TTL_SECONDS,
)
from core.database import supabase_client, redis_client
from core.security import hash_password
from service.common.models import UserSignup, Role
from service.common.email_service import send_otp_email

logger = logging.getLogger(__name__)

def normalize_email(email: str) -> str:
    return (email or "").strip().lower()

def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))

def check_existing_user(email: str) -> bool:
    email = normalize_email(email)
    if not supabase_client:
        return False
    try:
        existing = (
            supabase_client.table("users")
            .select("id")
            .eq("email", email)
            .execute()
        )
        return bool(existing.data)
    except Exception as e:
        logger.error(f"Supabase user check error: {e}")
        return False

def initiate_signup_otp(payload: UserSignup) -> Dict[str, Any]:
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis unavailable for OTP verification")
    email = normalize_email(payload.email)
    username = payload.username.strip()
    hashed_pw = hash_password(payload.password)
    org_id = payload.org_id.strip() or f"org_{uuid.uuid4().hex[:8]}"
    otp = generate_otp()
    pending_user = {
        "email": email,
        "username": username,
        "password_hash": hashed_pw,
        "role": payload.Role or Role.USER.value,
        "org_id": org_id,
        "tenant_id": payload.tenant_id,
        "otp": otp,
    }
    redis_client.setex(f"signup:{email}", OTP_TTL_SECONDS, json.dumps(pending_user))
    try:
        send_otp_email(email, otp, "signup")
    except Exception as e:
        logger.error(f"Signup OTP email failed for {email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send verification email.")
    return {"detail": "OTP sent to email. Please verify within 5 minutes."}


def verify_signup_otp(email: str, provided_otp: str) -> Dict[str, Any]:
    if not redis_client or not supabase_client:
        raise HTTPException(status_code=503, detail="Database or Redis unavailable")
    email = normalize_email(email)
    redis_key = f"signup:{email}"
    stored_raw = redis_client.get(redis_key)
    if not stored_raw:
        raise HTTPException(status_code=400, detail="OTP expired or invalid email.")
    stored_data = json.loads(stored_raw)
    if not hmac.compare_digest(stored_data.get("otp", ""), provided_otp.strip()):
        raise HTTPException(status_code=400, detail="Incorrect OTP.")
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat()
    role_val = stored_data.get("role") or Role.USER.value
    org_id = stored_data["org_id"]
    try:
        supabase_client.table("users").insert({
            "id": user_id,
            "username": stored_data["username"],
            "email": email,
            "password_hash": stored_data["password_hash"],
            "role": role_val,
            "org_id": org_id,
            "allow_global_upload": False,
            "is_active": True,
            "tenant_id": stored_data.get("tenant_id"),
            "created_at": created_at,
        }).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"User creation failed: {e}")
    redis_client.delete(redis_key)
    try:
        redis_client.setex(
            f"user:{user_id}:meta", 3600,
            json.dumps({"email": email, "role": role_val, "org_id": org_id})
        )
    except Exception as e:
        logger.warning(f"Redis cache failed: {e}")

    return {"detail": "Signup successful. You can now log in.", "user_id": user_id, "email": email, "org_id": org_id}

def fetch_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    user = None
    if redis_client:
        try:
            cached = redis_client.get(f"user:email:{email}")
            if cached:
                user = json.loads(cached)
        except Exception as e:
            logger.warning(f"Redis read failed: {e}")

    if not user and supabase_client:
        try:
            result = (
                supabase_client.table("users")
                .select("*")
                .eq("email", email)
                .execute()
            )
            if result.data:
                user = result.data[0]
                if redis_client:
                    redis_client.setex(f"user:email:{email}", 3600, json.dumps(user))
        except Exception as e:
            logger.error(f"Supabase user lookup failed: {e}")

    return user

def initiate_forgot_password(email: str) -> Dict[str, Any]:

    if not redis_client or not supabase_client:
        raise HTTPException(status_code=503, detail="Service unavailable")
    
    email = normalize_email(email)
    res = supabase_client.table("users").select("id").eq("email", email).execute()

    if not res.data:
        return {"detail": "If an account exists, an OTP has been sent."}
    
    otp = generate_otp()
    redis_client.setex(f"reset:{email}", OTP_TTL_SECONDS, otp)

    try:
        send_otp_email(email, otp, "reset")
    except Exception as e:
        logger.error(f"Password reset email failed for {email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send reset email.")
    return {"detail": "If an account exists, an OTP has been sent."}


def reset_user_password(email: str, provided_otp: str, new_password: str) -> Dict[str, Any]:

    if not redis_client or not supabase_client:
        raise HTTPException(status_code=503, detail="Service unavailable")
    
    email = normalize_email(email)
    redis_key = f"reset:{email}"
    stored_otp = redis_client.get(redis_key)

    if not stored_otp or not hmac.compare_digest(stored_otp, provided_otp.strip()):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    
    hashed_pw = hash_password(new_password)
    supabase_client.table("users").update({"password_hash": hashed_pw}).eq("email", email).execute()
    redis_client.delete(redis_key)
    redis_client.delete(f"user:email:{email}")  # Evict stale password_hash from cache
    
    return {"detail": "Password successfully reset. You can now log in."}



def blacklist_user_session(user_id: str, exp: Optional[int]) -> None:
    if redis_client and exp:
        now_ts = int(datetime.now(timezone.utc).timestamp())
        ttl = exp - now_ts
        if ttl > 0:
            try:
                redis_client.setex(f"blacklist:{user_id}", ttl, str(now_ts))
            except Exception as e:
                logger.warning(f"Redis blacklist error: {e}")


# STEP 2: REDIRECT TO AUTHORIZATION SERVER (URL BUILDER)
# ============================================================================
def construct_google_authorization_url(
    custom_redirect_uri: Optional[str] = None,
    client_state_csrf_token: Optional[str] = None
) -> str:
    """
    Constructs the full authorization URL to redirect the user to Google.
    
    Scopes requested:
    - openid: OpenID Connect standard authentication
    - email: Access to user's verified primary email address
    - profile: Access to user's basic profile details (name, avatar picture)
    """
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth Client ID is not configured on the server."
        )
    authorization_parameters: Dict[str, str] = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": custom_redirect_uri or GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",  # Requests a refresh token from Google
        "prompt": "select_account",  # Allows user to switch accounts easily
        "state": client_state_csrf_token or secrets.token_urlsafe(16),
    }
    formatted_query_string = urlencode(authorization_parameters)
    complete_authorization_url = f"{GOOGLE_AUTHORIZATION_ENDPOINT}?{formatted_query_string}"
    return complete_authorization_url


# STEP 4 & 5: REQUEST & ISSUE ACCESS TOKEN (CODE EXCHANGE)
# ============================================================================
async def exchange_authorization_code_for_google_tokens(
    authorization_code: str,
    registered_redirect_uri: str
) -> Dict[str, Any]:
    """
    Exchanges the short-lived authorization code received from Google for:
    - access_token: Temporary bearer key with scope and expiry.
    - id_token: Signed JSON Web Token verifying identity.
    - expires_in: Token lifespan in seconds.
    - scope: Permissions approved by the user.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Client ID or Client Secret is missing in server environment."
        )
    # Payload required by Google's OAuth2 token endpoint
    token_exchange_request_payload: Dict[str, str] = {
        "code": authorization_code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": registered_redirect_uri,
        "grant_type": "authorization_code",
    }
    # Perform asynchronous POST request to Google Authorization Server
    async with httpx.AsyncClient(timeout=10.0) as http_client:
        try:
            google_token_endpoint_response = await http_client.post(
                GOOGLE_TOKEN_EXCHANGE_ENDPOINT,
                data=token_exchange_request_payload,
                headers={"Accept": "application/json"}
            )
        except Exception as network_exception:
            logger.error(f"Network error contacting Google Token Endpoint: {network_exception}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to contact Google authentication service."
            )
    # Validate server response status
    if google_token_endpoint_response.status_code != 200:
        logger.error(
            f"Google token exchange rejected: {google_token_endpoint_response.status_code} "
            f"- {google_token_endpoint_response.text}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google authorization code is invalid, expired, or already used."
        )
    # Step 5: Parse the issued access token package
    token_response_data: Dict[str, Any] = google_token_endpoint_response.json()
    
    # Extract token attributes
    google_access_token: str = token_response_data.get("access_token", "")
    token_lifespan_seconds: int = token_response_data.get("expires_in", 0)
    granted_scopes: str = token_response_data.get("scope", "")
    logger.info(
        f"Access token received successfully. Lifespan: {token_lifespan_seconds}s, "
        f"Granted Scopes: {granted_scopes}"
    )
    return token_response_data

# STEP 6: CLIENT ACCESSES RESOURCES (GOOGLE USERINFO API)
# ============================================================================
async def retrieve_google_user_profile(google_access_token: str) -> Dict[str, Any]:
    """
    Presents the temporary Google access token to the Google Resource Server
    (UserInfo API) to retrieve the user's verified identity, email, and display name.
    """
    authorization_bearer_header: Dict[str, str] = {
        "Authorization": f"Bearer {google_access_token}",
        "Accept": "application/json"
    }
    async with httpx.AsyncClient(timeout=10.0) as http_client:
        try:
            resource_server_response = await http_client.get(
                GOOGLE_USERINFO_RESOURCE_ENDPOINT,
                headers=authorization_bearer_header
            )
        except Exception as network_exception:
            logger.error(f"Error accessing Google UserInfo Resource Server: {network_exception}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to fetch profile from Google Resource Server."
            )
    if resource_server_response.status_code != 200:
        logger.error(f"Google Resource Server returned error: {resource_server_response.text}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to retrieve user profile from Google with the provided access token."
        )
    user_profile_data: Dict[str, Any] = resource_server_response.json()
    # Validate that Google has confirmed the user's email address
    is_email_verified: bool = user_profile_data.get("email_verified", False)
    if not is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Google account provided does not have a verified email address."
        )
    return user_profile_data

# STEP 7: MULTI-TENANT USER ACCOUNT RESOLUTION & SESSION INITIALIZATION
# ============================================================================
def resolve_or_register_oauth_user(
    google_profile: Dict[str, Any],
    requested_organization_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Handles internal account mapping:
    - If user exists -> Validates status & returns existing record (Login).
    - If user is new -> Automatically registers account into Supabase (Sign Up).
    - Ensures tenant isolation and populates Redis session metadata.
    """
    raw_user_email: Optional[str] = google_profile.get("email")
    if not raw_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User email was not provided by Google."
        )
    normalized_user_email: str = raw_user_email.strip().lower()
    user_display_name: str = (
        google_profile.get("name")
        or google_profile.get("given_name")
        or normalized_user_email.split("@")[0]
    ).strip()[:50]
    # Check if user record already exists in database/cache
    existing_user_record: Optional[Dict[str, Any]] = fetch_user_by_email(normalized_user_email)
    if existing_user_record:
        # Existing account login flow
        is_user_active: bool = existing_user_record.get("is_active", True)
        if not is_user_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is deactivated. Please contact platform support."
            )
        return existing_user_record
    # User does not exist -> Auto-provision new account (Sign Up flow)
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable for user account registration."
        )
    generated_user_id: str = f"usr_{uuid.uuid4().hex[:12]}"
    account_created_timestamp: str = datetime.now(timezone.utc).isoformat()
    # Guard against None before calling .strip() — org_id is optional for OAuth users
    assigned_organization_id: str = (
        (requested_organization_id or "").strip()
        or f"org_{uuid.uuid4().hex[:8]}"
    )
    assigned_user_role: str = Role.USER.value
    # Store a cryptographic high-entropy unguessable password hash
    # Prevents unauthorized plain-password logins on OAuth-exclusive accounts
    random_unusable_password_hash: str = hash_password(secrets.token_urlsafe(32))
    new_user_database_record: Dict[str, Any] = {
        "id": generated_user_id,
        "username": user_display_name,
        "email": normalized_user_email,
        "password_hash": random_unusable_password_hash,
        "role": assigned_user_role,
        "org_id": assigned_organization_id,
        "allow_global_upload": False,
        "is_active": True,
        "created_at": account_created_timestamp,
    }
    try:
        database_insert_result = (
            supabase_client.table("users")
            .insert(new_user_database_record)
            .execute()
        )
        persisted_user: Dict[str, Any] = (
            database_insert_result.data[0]
            if database_insert_result.data
            else new_user_database_record
        )
    except Exception as database_insert_error:
        logger.error(f"Failed to insert new Google user to Supabase: {database_insert_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database user provisioning failed: {str(database_insert_error)}"
        )
    # Populate Redis session cache
    if redis_client:
        try:
            cached_session_metadata = {
                "email": normalized_user_email,
                "role": assigned_user_role,
                "org_id": assigned_organization_id
            }
            redis_client.setex(
                f"user:{generated_user_id}:meta",
                3600,
                json.dumps(cached_session_metadata)
            )
            redis_client.setex(
                f"user:email:{normalized_user_email}",
                3600,
                json.dumps(persisted_user)
            )
        except Exception as redis_cache_error:
            logger.warning(f"Failed writing user session metadata to Redis: {redis_cache_error}")
    return persisted_user
