import base64
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status, Header, Cookie, Depends
from passlib.context import CryptContext
from jose import JWTError, jwt
from core.config import SECRET_KEY, ALGORITHM , ACCESS_TOKEN_EXPIRE_MINUTES 
from service.common.models import Role, TokenClaims
from core.database import supabase_client

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(
    user_id: str, email: str, role: Role, 
    org_id: Optional[str] = None, 
    username: Optional[str] = None,                      
    allow_global_upload: bool = False                    
) -> str:
    payload = {
        "sub": user_id,
        "user_id": user_id,
        "username": username or email.split("@")[0],     
        "email": email,
        "role": role.value,
        "org_id": org_id,
        "allow_global_upload": allow_global_upload,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_jwt_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}"
        )

def extract_raw_jwt(
    authorization: Optional[str] = Header(None),
    access_token_cookie: Optional[str] = Cookie(None, alias="access_token")
) -> str:
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
        return authorization
    if access_token_cookie:
        return access_token_cookie
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication JWT token missing."
    )

async def get_current_user(
    token: Optional[str] = Depends(extract_raw_jwt)
) -> TokenClaims:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No token provided"
        )
    payload = decode_jwt_token(token)

    role = Role(payload.get("role", "User"))
    org_id = payload.get("org_id")

    if role != Role.SUPER_ADMIN and org_id and supabase_client:
        try:
            org_check = (
                supabase_client.table("organization_settings")
                .select("is_disabled, disabled_reason")
                .eq("org_id", org_id)
                .execute()
            )
            if org_check.data and org_check.data[0].get("is_disabled"):
                reason = org_check.data[0].get("disabled_reason") or "Please contact your Administrator."
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Your organisation '{org_id}' has been suspended. Reason: {reason}"
                )
        except HTTPException:
            raise
        except Exception:
            pass
    return TokenClaims(
        user_id=payload.get("user_id"),
        email=payload.get("email"),
        username=payload.get("username"),
        allow_global_upload=bool(payload.get("allow_global_upload", False)),
        role=role,
        org_id=org_id,
        tenant_id=payload.get("tenant_id"),
        exp=payload.get("exp")
    )

class RoleChecker:
    def __init__(self, allowed_roles: List[Role]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: TokenClaims = Depends(get_current_user)) -> TokenClaims:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {[r.value for r in self.allowed_roles]}"
            )
        return current_user

def enforce_tenant_access(requested_org_id: str, current_user: TokenClaims):
    if current_user.role == Role.SUPER_ADMIN:
        return True

    if supabase_client and requested_org_id:
        try:
            org_check = (
                supabase_client.table("organization_settings")
                .select("is_disabled")
                .eq("org_id", requested_org_id)
                .execute()
            )
            if org_check.data and org_check.data[0].get("is_disabled"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Organisation access is currently suspended by Platform Administrator."
                )
        except HTTPException:
            raise
        except Exception:
            pass
        
    if current_user.org_id != requested_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant Isolation Policy: Access to requested organisation data is forbidden"
        )
    return True

def decode_base64_to_image(data_url: str):
    if not data_url.startswith("data:") or ";base64," not in data_url:
        raise HTTPException(status_code=500, detail="Stored image format is invalid or corrupted")
    header, encoded = data_url.split(";base64,", 1)
    media_type = header.replace("data:", "", 1)
    try:
        image_bytes = base64.b64decode(encoded)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not decode stored image: {e}")
    return media_type, image_bytes

# Alias for backwards compatibility
create_jwt_token = create_access_token