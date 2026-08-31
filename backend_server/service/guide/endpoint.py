from fastapi import APIRouter
from service.guide.helper import get_platform_guide_content

router = APIRouter(tags=["Help & Guide"])

@router.get("/api/v1/guide")
async def platform_guide():
    return get_platform_guide_content()

@router.get("/health")
async def health():
    return {"status": "healthy"}

@router.get("/")
async def root():
    return {
        "service": "Global RAG v2.0",
        "services": ["local & global upload", "RBAC", "authentication", "hybrid retrieval"]
    }
