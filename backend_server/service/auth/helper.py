import logging
import json
import uuid
import secrets
import string
import hmac
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException
from core.config import OTP_TTL_SECONDS
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
