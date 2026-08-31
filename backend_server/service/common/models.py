from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

class Role(str, Enum):
    SUPER_ADMIN = "Super Admin"
    ADMIN = "Admin"
    USER = "User"

class DocumentType(str, Enum):
    PLAIN_TEXT = "plain text"
    PDF_TEXT = "pdf text"
    PDF_SCANNED = "pdf scanned"
    DOCX = "docx"
    XLSX = "xlsx"
    PPTX = "pptx"
    IMAGE = "image"
    HTML = "html"
    UNKNOWN = "unknown"

class UploadMode(str, Enum):
    GLOBAL = "global"
    LOCAL = "local"

class QueryMode(str, Enum):
    GLOBAL = "global"
    LOCAL  = "local"
    BOTH   = "both"

class OrgSettingsUpdate(BaseModel):
    allow_user_global_upload: bool

class OrgSettingsResponse(BaseModel):
    org_id: str
    allow_user_global_upload: bool

class UserSignup(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    org_id: str
    tenant_id: Optional[str] = None
    Role: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenClaims(BaseModel):
    user_id: str
    email: str
    role: Role
    org_id: Optional[str] = None
    tenant_id: Optional[str] = None
    exp: Optional[int] = None
    iat: Optional[int] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    org_id: Optional[str] = None

class DocumentMetadata(BaseModel):
    file_name: str
    file_size: int
    file_hash: str
    total_pages: int
    upload_type: UploadMode
    uploaded_by: str
    uploaded_at: str
    org_id: str
    status: str = "processing"

class ChunkMetadata(BaseModel):
    chunk_id: str
    document_id: str
    page_number: int
    chunk_index: int
    org_id: str
    upload_type: UploadMode
    text_preview: str
    embedding_model: str

class RAGRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    upload_mode: QueryMode = QueryMode.GLOBAL
    top_k: int = 5
    vector_weight: float = 0.7
    keyword_weight: float = 0.3
    language: str = "English"
    system_prompt: Optional[str] = None

class SourceResult(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    chunk_index: int
    similarity_score: float
    text_preview: str
    org_id: str
    upload_mode: str
    document_url: str
    image_data: Optional[str] = None
    is_image: bool = False

class RAGResponse(BaseModel):
    answer: str
    query: str
    language: str
    query_mode: QueryMode
    sources: List[SourceResult]
    total_sources_found: int
    generated_by: str
    org_id: str
    queried_at: str
    session_id: str

class UserInfo(BaseModel):
    user_id: str
    email: str
    role: Role
    org_id: Optional[str] = None
    created_at: str

class UploadConsent(BaseModel):
    upload_mode: UploadMode
    confirmed: bool = False

class ConsentMessage(BaseModel):
    upload_mode: UploadMode
    title: str
    message: str
    confirm_label: str = "Got it"
    warning_label: Optional[str] = None

class UploadReport(BaseModel):
    doc_id: str
    file_name: str
    upload_mode: UploadMode
    org_id: str
    doc_type: str
    total_pages: int
    pages_newly_indexed: int
    pages_skipped: int
    chunks_created: int
    status: str
    uploaded_at: str
