import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Production logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("rag_application")

from service.auth.endpoint import router as auth_router
from service.upload.endpoint import router as upload_router
from service.documents.endpoint import router as documents_router
from service.query.endpoint import router as query_router
from service.admin.endpoint import router as admin_router
from service.super_admin.endpoint import router as super_admin_router
from service.guide.endpoint import router as guide_router

app = FastAPI(
    title="Global RAG Application API",
    version="2.2.0",
    description="Enterprise RAG backend with LangChain chunking, Supabase Delta Registries, pgvector on Neon, and RBAC."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://13.201.77.82",
        "http://13.201.77.82:80",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Modular Service Routers
app.include_router(auth_router)
app.include_router(upload_router)
app.include_router(documents_router)
app.include_router(query_router)
app.include_router(admin_router)
app.include_router(super_admin_router)
app.include_router(guide_router)

if __name__ == "__main__":
    
    uvicorn.run("main:app", host="0.0.0.0", port=7000, reload=True)