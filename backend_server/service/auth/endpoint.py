from datetime import timedelta, datetime, timezone
from fastapi import APIRouter, HTTPException, status, Response, Depends
from core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from core.security import (
    verify_password,
    create_jwt_token,
    get_current_user,
)
from service.common.models import (
    UserSignup,
    UserLogin,
    TokenResponse,
    UserInfo,
    TokenClaims,
)
from service.auth.helper import (
    check_existing_user,
    register_user,
    fetch_user_by_email,
    blacklist_user_session,
)

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: UserSignup):
    if check_existing_user(payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return register_user(payload)

@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, response: Response):
    user = fetch_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_jwt_token(
        claims={
            "user_id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "org_id": user.get("org_id"),
            "tenant_id": user.get("tenant_id"),
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return TokenResponse(
        access_token=token,
        role=user["role"],
        org_id=user.get("org_id"),
    )

@router.post("/logout")
async def logout(response: Response, current_user: TokenClaims = Depends(get_current_user)):
    blacklist_user_session(current_user.user_id, current_user.exp)
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserInfo)
async def get_me(current_user: TokenClaims = Depends(get_current_user)):
    return UserInfo(
        user_id=current_user.user_id,
        email=current_user.email,
        role=current_user.role,
        org_id=current_user.org_id,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
