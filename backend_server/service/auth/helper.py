import logging
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException
from core.database import supabase_client, redis_client
from core.security import hash_password
from service.common.models import UserSignup, Role

logger = logging.getLogger(__name__)

def check_existing_user(email: str) -> bool:
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

def register_user(payload: UserSignup) -> Dict[str, Any]:
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    hashed_pw = hash_password(payload.password)
    org_id = payload.org_id or f"org_{uuid.uuid4().hex[:8]}"
    created_at = datetime.now(timezone.utc).isoformat()

    if supabase_client:
        try:
            supabase_client.table("users").insert({
                "id": user_id,
                "username":payload.username,
                "email": payload.email,
                "password_hash": hashed_pw,
                "role": payload.Role or Role.USER,
                "org_id": org_id,
                "allow_global_upload": False,       
                "tenant_id": payload.tenant_id,
                "created_at": created_at,
            }).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"User creation failed: {e}")

    if redis_client:
        try:
            redis_client.setex(
                f"user:{user_id}:meta", 3600,
                json.dumps({"email": payload.email, "role": payload.Role or Role.USER, "org_id": org_id})
            )
        except Exception as e:
            logger.warning(f"Redis cache failed: {e}")

    return {"user_id": user_id, "email": payload.email, "org_id": org_id}

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

def blacklist_user_session(user_id: str, exp: Optional[int]) -> None:
    if redis_client and exp:
        ttl = exp - int(datetime.now(timezone.utc).timestamp())
        if ttl > 0:
            try:
                redis_client.setex(f"blacklist:{user_id}", ttl, "1")
            except Exception as e:
                logger.warning(f"Redis blacklist error: {e}")
