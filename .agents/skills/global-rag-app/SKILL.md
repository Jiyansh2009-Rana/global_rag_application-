---
name: global-rag-app
description: Comprehensive operational runbook, API testing, debugging procedures, and development skill for the Rag-Agent application (FastAPI, React, pgvector, Redis, Groq, Jina).
---

# Rag-Agent application — Skill & Operational Runbook

This skill provides step-by-step procedures, runbooks, and recipes for developing, testing, maintaining, and deploying the **Rag-Agent application**.

---

## 1. Quick Reference Commands

### Local Development

| Service | Working Directory | Command | Notes |
|---|---|---|---|
| **Backend API** | `backend_server/` | `uvicorn main:app --reload --port 7000` | Runs on `http://localhost:7000` |
| **Frontend Client** | `client/` | `npm run dev` | Runs on `http://localhost:5173` (proxies `/api` to 7000) |
| **Typecheck Client** | `client/` | `npm run typecheck` | Validates TypeScript schemas |
| **Lint Client** | `client/` | `npm run lint` | ESLint checks |
| **Build Client** | `client/` | `npm run build` | Compiles to `client/dist/` |

### Docker Compose Orchestration

```powershell
# Build and launch all three services (Frontend, Backend, Redis) in background
docker compose up --build -d

# View live container logs
docker compose logs -f

# View backend logs specifically
docker compose logs -f backend

# Check status of containers
docker compose ps

# Stop all services
docker compose down
```

---

## 2. Environment Configuration Runbook

### Backend Environment: `backend_server/.env`

Create `backend_server/.env` with the following variables:

```env
# Security & JWT
JWT_SECRET_KEY=your-secure-random-jwt-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Supabase (Registry, Users, Storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Neon PostgreSQL (Vector Database)
NEON_DATABASE_URL=postgresql://user:password@ep-host.region.aws.neon.tech/dbname?sslmode=require

# AI & Embedding Providers
GROQ_API_KEY=your-groq-api-key
JINA_API_KEY=your-jina-ai-api-key

# Google OAuth (Optional / SSO)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Redis Cache (Set to redis://redis_db:6379 in Docker or localhost:6379 locally)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Automated SMTP Notifications (Org Suspensions)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME="Global RAG Platform"
SMTP_FROM_EMAIL=your-email@gmail.com
```

### Frontend Environment: `client/.env.production` / `.env`

```env
# Production (Relative path handled by Nginx proxy)
VITE_API_BASE_URL=/api/v1

# Local Development fallback (if not using Vite dev proxy)
# VITE_API_BASE_URL=http://localhost:7000/api/v1
```

---

## 3. Database & Infrastructure Setup

### 3.1 Neon PostgreSQL (`pgvector`) Table Setup

Run the following SQL migration on your Neon database:

```sql
-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create document_chunks table
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

-- 3. Create HNSW or IVFFlat index for fast vector retrieval
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_chunks_org_id ON document_chunks(org_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
```

### 3.2 Supabase Schema & Storage Setup

1. **Create Storage Bucket**:
   - Bucket Name: `global_documents`
   - Privacy: Private (accessed via Service Role Key).
   - Storage Path convention: `{org_id}/{doc_id}/{filename}`

2. **Create Supabase Tables**:
   - `users` (`id`, `username`, `email`, `password_hash`, `role`, `org_id`, `allow_global_upload`, `tenant_id`, `created_at`)
   - `organization_settings` (`org_id`, `allow_user_global_upload`, `is_disabled`, `disabled_at`, `disabled_reason`, `updated_at`)
   - `document_registry` (`id`, `org_id`, `file_name`, `file_hash`, `uploaded_by`, `total_pages`, `status`, `uploaded_at`)
   - `page_registry` (`id`, `document_id`, `page_number`, `page_hash`, `chunk_ids`, `org_id`, `indexed_at`)
   - `chat_history` (`id`, `user_id`, `session_id`, `org_id`, `query`, `answer`, `query_mode`, `created_at`)
   - `audit_log` (`id`, `event_type`, `user_id`, `org_id`, `role`, `doc_id`, `file_name`, `file_hash`, `doc_type`, `original_filename`, `alias_filename`, `query_text`, `query_mode`, `sources_found`, `ip_address`, `note`, `timestamp`)

---

## 4. Operational Workflows & Testing

### 4.1 Testing Document Ingestion (SSE Stream)

To upload and test document ingestion via cURL:

```bash
# 1. Login to retrieve access token
TOKEN=$(curl -s -X POST http://localhost:7000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"yourpassword"}' \
  | jq -r '.access_token')

# 2. Get upload consent
curl -s -X GET "http://localhost:7000/api/v1/upload/consent?upload_mode=global" \
  -H "Authorization: Bearer $TOKEN"

# 3. Stream document upload and delta indexing
curl -N -X POST http://localhost:7000/api/v1/upload/document \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample_policy.pdf" \
  -F "upload_mode=global" \
  -F "confirmed=true"
```

**Expected SSE Output Flow**:
```
data: {"status": "extracting_text", "message": "Running OCR..."}
: heartbeat
data: {"status": "extraction_complete", "total_pages": 4, "filename": "sample_policy.pdf"}
data: {"status": "processing_set", "set_id": "doc_xxxx_set_0000", "pages": [1, 2, 3, 4]}
data: {"status": "set_complete", "set_id": "doc_xxxx_set_0000", "report": {"chunks_created": 12, "pages_newly_indexed": 4, "pages_skipped": 0}}
data: {"status": "upload_complete", "doc_id": "doc_xxxx", "total_chunks": 12}
```

### 4.2 Testing RAG Query Execution (SSE Stream)

```bash
curl -N -X POST http://localhost:7000/api/v1/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the organization refund policy?",
    "upload_mode": "global",
    "top_k": 5,
    "vector_weight": 0.7,
    "keyword_weight": 0.3,
    "language": "English"
  }'
```

**Expected SSE Output Flow**:
```
data: {"event": "sources", "data": [{"chunk_id": "chunk_xxx", "document_name": "sample_policy.pdf", "page_number": 2, "similarity_score": 0.892, "text_preview": "Refunds are processed within 14 days..."}]}
data: {"event": "token", "data": "According"}
data: {"event": "token", "data": " to"}
data: {"event": "token", "data": " the"}
data: {"event": "token", "data": " policy,"}
...
data: {"event": "done", "session_id": "session_xxxx"}
```

---

## 5. Administration & Governance Procedures

### 5.1 Suspending an Organisation (Super Admin)
When a Super Admin toggles an organisation's status to disabled:
1. Endpoint: `POST /api/v1/super-admin/organizations/{org_id}/toggle-status`
2. Body: `{"is_disabled": true, "reason": "Non-payment of subscription"}`
3. Backend:
   - Updates `organization_settings` table.
   - Dispatches background task `send_organization_disabled_email()` to notify the Org Admin.
   - Blocks subsequent logins and queries from all members in that organisation.

### 5.2 Document Deletion & Purge Procedure
When an Admin or Super Admin deletes a document (`DELETE /api/v1/admin/documents/{doc_id}`):
1. Verifies tenant ownership (`org_id` match) or Super Admin role.
2. Removes vector chunks from Neon PostgreSQL (`DELETE FROM document_chunks WHERE document_id = %s`).
3. Deletes records from Supabase `page_registry` and `document_registry`.
4. Deletes raw file from Supabase Storage bucket `global_documents`.
5. Records deletion in `audit_log`.

---

## 6. Common Issues & Troubleshooting

| Symptom | Probable Cause | Resolution |
|---|---|---|
| **OCR Fails / `pdf2image` Error** | Poppler or Tesseract not installed on host/container. | In Linux/Docker: `apt-get install -y tesseract-ocr poppler-utils`. On Windows: Install Tesseract & Poppler and add to `PATH`. |
| **502 Bad Gateway on Embeddings** | Jina API key invalid, rate-limited, or expired. | Verify `JINA_API_KEY` in `backend_server/.env`. Test key with direct `curl https://api.jina.ai/v1/embeddings`. |
| **502 Bad Gateway on Query** | Groq rate limit hit on primary model. | Automatic fallback is built-in (`qwen/qwen3.6-27b` $\to$ `llama-3.3-70b-versatile`). If all fail, check `GROQ_API_KEY` quota. |
| **401 Unauthorized / Token Expired** | Session exceeded 24 hours (1440 min). | Frontend `apiFetch` catches 401, clears `localStorage`, and triggers re-login redirect. |
| **Local Document Disappears** | 1-hour Redis TTL expired. | Local documents are ephemeral by design (TTL 3600s). Re-upload in Global mode if persistence is required. |
| **Database Connection Timeout** | Neon compute endpoint is suspended / sleeping. | Neon serverless PostgreSQL wakes up in ~1-2s. Ensure `connect_timeout=3` or higher in `get_neon_connection()`. |

---

## 7. Verification Checklist for Changes

When modifying code in this repository, always verify:
- [ ] **Backend Syntax & Dependencies**: Run `python -m py_compile` on modified Python files.
- [ ] **FastAPI Endpoints**: Ensure all endpoints are registered in `main.py` and have appropriate `tags` and `response_model` annotations.
- [ ] **RBAC Restrictions**: Verify that non-admin users cannot access `/api/v1/admin/*` or `/api/v1/super-admin/*`.
- [ ] **Tenant Scoping**: Ensure every SQL or Supabase query filters by `org_id`.
- [ ] **Frontend Compilation**: Run `npm run typecheck` and `npm run build` in `client/` to ensure no TypeScript or JSX build errors.
- [ ] **Docker Compose Build**: Run `docker compose build` to confirm all multi-stage containers build without errors.
