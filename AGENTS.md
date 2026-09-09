# Rag-Agent application — AI Agent Rules & Workspace Guidelines

Master workspace rules and operating constraints for AI agents in this repository.

## 1. System Topology & Technology Map

- **Backend**: FastAPI (`backend_server/`) on port `7000` (Python 3.11).
- **Frontend**: React 18 + Vite + Tailwind CSS v4 (`client/`) on port `5173` (dev) / port `80` (Docker).
- **Vector DB**: Neon PostgreSQL with `pgvector` (1024-dimensional vectors).
- **Registries & Storage**: Supabase (`document_registry`, `page_registry`, `global_documents` bucket).
- **Session / Ephemeral Cache**: Redis (`redis_database/`) on port `6379` (1-hour TTL for local mode).
- **AI Models**: Groq (`qwen/qwen3.6-27b` $\to$ `llama-3.3-70b-versatile` fallback) & Jina AI (`jina-clip-v2`).

---

## 2. Mandatory Rules for Code Modifications

### 2.1 Backend Operations (`backend_server/`)
- **No Direct SQL without Tenant Scoping**: Every query to Neon PostgreSQL or Supabase must strictly isolate data by `org_id`.
- **Preserve SSE Formats**: Ingestion and Query routes stream Server-Sent Events (`text/event-stream`). Never convert them to regular JSON responses without updating the client stream parsers.
- **Delta Indexing Integrity**: Always check file hashes (SHA-256) and page hashes (MD5) before running text splitters and generating embeddings.
- **Coordinated Document Deletion**: Deletion of a global document must remove records across Neon `document_chunks`, Supabase `page_registry`, Supabase `document_registry`, and Supabase Storage in a single operation.

### 2.2 Frontend Operations (`client/`)
- **Type Safety**: Maintain schemas in `client/src/api/types.ts` synchronized with backend Pydantic models in `backend_server/service/common/models.py`.
- **No Direct `fetch` Calls**: Route all HTTP and SSE communication through `client/src/api/client.ts` and domain API modules.
- **Design System Consistency**: Adhere to the glassmorphism dark teal theme tokens defined in CSS variables (`--bg`, `--accent`, `--glass`).

---

## 3. Reference Documentation

- [agent.md](file:///c:/Users/JIYANSH/Desktop/git-repos/global_rag_application-/agent.md): In-depth system architecture and technical reference.
- [skill.md](file:///c:/Users/JIYANSH/Desktop/git-repos/global_rag_application-/skill.md): Operational runbook, API testing recipes, and troubleshooting guide.
- [README.md](file:///c:/Users/JIYANSH/Desktop/git-repos/global_rag_application-/README.md): Quickstart and VPS deployment guide.
