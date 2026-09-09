# Rag-Agent application — Agent Guidelines & System Architecture

This document serves as the master guide and operational rulebook for AI agents, developers, and automated tools working on the **Rag-Agent application** codebase.

---

## 1. Project Overview & System Identity

The **Rag-Agent application** is an enterprise-grade, multi-tenant **Retrieval-Augmented Generation (RAG)** platform designed for secure, role-isolated document ingestion and natural language querying.

### High-Level Architecture
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS v4, `@tanstack/react-query`, Framer Motion, Server-Sent Events (SSE) streaming consumer.
- **Backend**: FastAPI (Python 3.11), Uvicorn, LangChain text splitters, Pydantic validation, PyJWT/python-jose security.
- **Relational & Vector Database**: Neon PostgreSQL (`pgvector` extension, 1024-dimensional cosine distance matching).
- **Document & Metadata Registry**: Supabase (Database tables, Delta registries, and `global_documents` Storage Bucket).
- **Session & Local Document Cache**: Redis (TTL 3600s / 1 hr for local private sessions and vector caches).
- **Multimodal Embeddings**: Jina AI (`jina-clip-v2`, 1024 dimensions, text & base64 image support).
- **LLM Inference**: Groq API (`qwen/qwen3.6-27b` with automatic fallback to `llama-3.3-70b-versatile`).
- **OCR Engine**: Tesseract OCR + `pdf2image` + Poppler for scanned PDFs and image text extraction.
- **Orchestration**: Docker Compose (Nginx reverse proxy frontend on port 80/5173, FastAPI on port 7000, Redis on port 6379).

---

## 2. Directory Structure & Key Files

```
global_rag_application-/
├── agent.md                        # Master Agent instructions and architectural guide
├── AGENTS.md                       # Antigravity/Agentic workspace rules
├── skill.md                        # Actionable developer runbook & operational workflows
├── docker-compose.yml              # 3-service deployment (frontend, backend, redis)
├── README.md                       # High-level overview & setup documentation
│
├── backend_server/                 # FastAPI backend application
│   ├── Dockerfile                  # Python 3.11 runtime + Tesseract & Poppler dependencies
│   ├── requirements.txt            # Python dependencies
│   ├── main.py                     # FastAPI application entrypoint & CORS middleware
│   │
│   ├── core/                       # Core system infrastructure
│   │   ├── config.py               # Environment variable loader and global constants
│   │   ├── database.py             # Neon, Supabase, Redis, and Groq client initializers
│   │   └── security.py             # JWT token handling, password hashing, RBAC dependencies
│   │
│   └── service/                    # Modular domain services
│       ├── common/                 # Cross-cutting models and helper utilities
│       │   ├── models.py           # Pydantic schemas, Enums (Role, UploadMode, DocumentType)
│       │   ├── helper.py           # Hashing algorithms (SHA-256, MD5), ID generators
│       │   └── email_service.py    # SMTP automated notification dispatch (Org suspensions)
│       ├── auth/                   # Authentication service (Signup, Login, Logout, /me)
│       │   ├── endpoint.py
│       │   └── helper.py
│       ├── upload/                 # Ingestion & Delta Indexing service (SSE progress stream)
│       │   ├── endpoint.py
│       │   └── helper.py
│       ├── query/                  # Hybrid RAG retrieval & Groq LLM streaming
│       │   ├── endpoint.py
│       │   └── helper.py
│       ├── documents/              # Secure document retrieval and download service
│       │   ├── endpoint.py
│       │   └── helper.py
│       ├── admin/                  # Org-level administration (Users, Documents, Global toggle)
│       │   ├── endpoint.py
│       │   └── helper.py
│       ├── super_admin/            # Platform-wide governance (Org status toggle, Global purge)
│       │   ├── endpoint.py
│       │   └── helper.py
│       └── guide/                  # In-app user manual & health check endpoints
│           ├── endpoint.py
│           └── helper.py
│
├── client/                         # Frontend React + TypeScript application
│   ├── Dockerfile                  # Multi-stage Node build + Nginx alpine production image
│   ├── nginx.conf                  # Nginx proxy configuration (/api/ -> backend:7000)
│   ├── package.json                # Dependencies and build scripts
│   ├── vite.config.ts              # Vite configuration with dev proxy
│   │
│   └── src/
│       ├── App.jsx                 # Integrated React UI application
│       ├── api/                    # Typed API client, fetch wrapper, and Zod schemas
│       │   ├── client.ts           # Token persistence, auto-refresh, 401 interceptor
│       │   ├── types.ts            # TypeScript interfaces & Zod validation schemas
│       │   ├── auth.ts             # Auth API calls
│       │   ├── upload.ts           # SSE upload stream consumer
│       │   ├── query.ts            # SSE query stream consumer
│       │   ├── admin.ts            # Org admin API calls
│       │   ├── super-admin.ts      # Super admin API calls
│       │   └── guide.ts            # Platform guide API calls
│       ├── app/                    # Providers (Auth, React Query, Theme)
│       ├── components/             # Reusable UI components (Modals, Badges, ScoreBar)
│       └── features/               # Modular page components (auth, chat, upload, admin)
│
└── redis_database/                 # Redis container configuration
    ├── Dockerfile
    └── redis.conf
```

---

## 3. Core Principles & Coding Standards

### 3.1 Backend Guidelines (Python / FastAPI)
1. **Strict Type Hinting & Pydantic Validation**: All request and response bodies must use typed Pydantic models from `backend_server/service/common/models.py`.
2. **Tenant Isolation**: Every database operation (Neon & Supabase) must enforce tenant isolation by scoping queries to `org_id`. Neon queries must set session variables `app.current_org_id`, `app.current_user_id`, and `app.current_role` where applicable.
3. **Delta Registry Ingestion**:
   - Before chunking and embedding, check file SHA-256 hash in `document_registry` or Redis.
   - Check page MD5 hash in `page_registry` to skip re-indexing unchanged pages.
   - Batch pages in chunks of `PAGES_PER_SET` (default: 5) to stream progress via SSE (`text/event-stream`).
4. **Resilient LLM Execution**:
   - Always wrap Groq completions in fallback logic (`qwen/qwen3.6-27b` $\to$ `llama-3.3-70b-versatile`) to handle API rate limits gracefully.
5. **Security & Session Revocation**:
   - All protected routes must use `get_current_user` or `RoleChecker` from `backend_server/core/security.py`.
   - Check organisation suspension status (`is_disabled`) on every authenticated request for non-super admins.

### 3.2 Frontend Guidelines (React / TypeScript)
1. **API Client Centralization**: Never call `fetch()` directly in UI components. Use `client/src/api/client.ts` or domain API functions in `client/src/api/`.
2. **SSE Streaming Protocol**:
   - Ingestion: Listen for `extracting_text`, `extraction_complete`, `processing_set`, `set_complete`, `alias_detected`, and `upload_complete`.
   - Query: Listen for `event: sources`, `event: token`, and `event: done`.
3. **Design Tokens & Glassmorphism**: Preserve the unified dark teal glassmorphism UI theme using CSS custom properties (`--bg`, `--accent`, `--muted`, `--glass`) defined in `client/src/App.jsx` and Tailwind CSS.
4. **State Persistence**: Store JWT token in `localStorage` under key `rag_access_token`. Handle `401 Unauthorized` events globally via `onUnauthorized.subscribe()`.

---

## 4. Roles, Permissions & Security Matrix

| Role | Scope | Query Modes | Upload Global | Upload Local | Org Admin Panel | Super Admin Panel |
|---|---|---|:---:|:---:|:---:|:---:|
| **User** | Single Org | Global, Local, Both | Conditional (Admin toggle) | ✅ (1 hr TTL) | ❌ | ❌ |
| **Admin** | Single Org | Global, Local, Both | ✅ | ✅ (1 hr TTL) | ✅ (Org Scope) | ❌ |
| **Super Admin** | Platform-wide | Global, Local, Both | ✅ | ✅ (1 hr TTL) | ✅ | ✅ (Global Scope) |

### Upload Modes
- **Global Upload**: Permanently stored in Supabase Storage (`global_documents`) and indexed into Neon PostgreSQL `document_chunks`. Accessible to all members of the organisation.
- **Local Upload**: Stored exclusively in Redis with a 3600-second (1 hour) TTL. Stored with base64 encoded raw data and vector chunks. Visible and queryable *only* by the uploading user session. Erased automatically upon expiry.

---

## 5. Ingestion & Document Processing Pipeline

1. **File Detection**: `detect_document_type(filename, file_bytes)` inspects extension and contents. Supported formats:
   - Plain Text / Markdown (`.txt`, `.md`)
   - PDF Text & Scanned PDF (`.pdf` via `pypdf` with fallback to `pdf2image` + `pytesseract` OCR)
   - Microsoft Word (`.docx` via `python-docx`)
   - Spreadsheets (`.xlsx`, `.csv` via `pandas` / `openpyxl`)
   - Presentations (`.pptx` via `python-pptx`)
   - Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif` via `Pillow` / Base64 Data URL)
   - HTML (`.html`, `.htm` via `BeautifulSoup4`)
2. **Text Extraction & Page Splitting**:
   - Formatted into page breaks (`---PAGE_BREAK---` or `---SLIDE_BREAK---`).
   - Grouped into batches of `PAGES_PER_SET = 5`.
3. **Delta Engine**:
   - `file_hash = SHA256(file_bytes)`
   - `page_hash = MD5(page_text)`
   - If page hash matches existing registry, chunking and embedding are skipped.
4. **Embedding Generation**:
   - Texts embedded via Jina API (`jina-clip-v2`, 1024-dim, normalized).
5. **Storage Dispatch**:
   - Global: Neon PostgreSQL table `document_chunks` + Supabase `document_registry` + Supabase Storage bucket.
   - Local: Redis keys (`local:{user_id}:{doc_id}:chunk:{chunk_id}`, TTL 3600s).

---

## 6. Query & Retrieval Engine

1. **Embedding**: User query is embedded using `jina-clip-v2`.
2. **Vector Retrieval**:
   - **Global**: Executed in Neon via SQL cosine distance:
     ```sql
     SELECT id, document_id, org_id, page_number, chunk_index, text, upload_mode,
            1 - (embedding <=> %s::vector) AS similarity_score
     FROM document_chunks
     WHERE org_id = %s AND 1 - (embedding <=> %s::vector) >= %s
     ORDER BY similarity_score DESC LIMIT %s;
     ```
   - **Local**: Executed in Redis by scanning user keys `local:{user_id}:*:chunk:*` and calculating dot product against stored embeddings.
   - **Both**: Merges and sorts top-$K$ chunks by score.
3. **Prompt Composition**: Dynamic context assembly with language instruction (English, Hindi, French, German, Spanish, Arabic, Chinese, Japanese).
4. **LLM Generation**: Token streaming via Groq API client with real-time SSE chunk forwarding to the browser.
5. **History & Auditing**: Queries in `global` or `both` modes are logged to Supabase `chat_history` and `audit_log`.

---

## 7. Database Schemas

### Neon PostgreSQL (`pgvector`)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL,
    org_id VARCHAR(64) NOT NULL,
    page_number INT NOT NULL,
    chunk_index INT NOT NULL,
    text TEXT NOT NULL,
    embedding vector(1024) NOT NULL,
    upload_mode VARCHAR(32) NOT NULL,
    set_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_org_id ON document_chunks(org_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id);
```

### Supabase Tables
- `users`: `id`, `username`, `email`, `password_hash`, `role`, `org_id`, `allow_global_upload`, `tenant_id`, `created_at`
- `organization_settings`: `org_id`, `allow_user_global_upload`, `is_disabled`, `disabled_at`, `disabled_reason`, `updated_at`
- `document_registry`: `id`, `org_id`, `file_name`, `file_hash`, `uploaded_by`, `total_pages`, `status`, `uploaded_at`
- `page_registry`: `id`, `document_id`, `page_number`, `page_hash`, `chunk_ids`, `org_id`, `indexed_at`
- `chat_history`: `id`, `user_id`, `session_id`, `org_id`, `query`, `answer`, `query_mode`, `created_at`
- `audit_log`: `id`, `event_type`, `user_id`, `org_id`, `role`, `doc_id`, `file_name`, `file_hash`, `doc_type`, `original_filename`, `alias_filename`, `query_text`, `query_mode`, `sources_found`, `ip_address`, `note`, `timestamp`

---

## 8. Agent Development Rules & Best Practices

1. **Do Not Break SSE Protocol**: When modifying endpoints returning `StreamingResponse`, adhere to SSE formatting (`data: {...}\n\n` or `event: ...\ndata: ...\n\n`).
2. **Preserve Error Formatting**: Return structured `HTTPException` with clear `detail` strings that map to user-friendly messages in `parseApiError()`.
3. **Environment Security**: Never hardcode API keys or database URLs. Always rely on `core/config.py`.
4. **Maintain Database Sync**: Whenever a global document is deleted, purge Neon `document_chunks`, Supabase `page_registry`, Supabase `document_registry`, and Supabase Storage in a single coordinated routine.
