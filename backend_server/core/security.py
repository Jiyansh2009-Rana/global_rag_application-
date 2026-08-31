import base64
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status, Header, Cookie, Depends
from passlib.context import CryptContext
from jose import JWTError, jwt
from core.config import SECRET_KEY, ALGORITHM
from service.common.models import Role, TokenClaims

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(claims: Dict[str, Any], expires_delta: timedelta) -> str:
    to_encode = claims.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": int(expire.timestamp())})
    to_encode.setdefault("iat", int(datetime.now(timezone.utc).timestamp()))
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

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
    return TokenClaims(
        user_id=payload.get("user_id"),
        email=payload.get("email"),
        role=Role(payload.get("role", "User")),
        org_id=payload.get("org_id"),
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
