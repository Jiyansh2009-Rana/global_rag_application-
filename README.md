# Global RAG Application

An enterprise-grade **Retrieval-Augmented Generation (RAG)** platform with role-based access control, multi-tenant document management, and a React + FastAPI full-stack architecture — fully containerised with Docker.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Roles & Permissions](#roles--permissions)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Docker Deployment](#docker-deployment)

---

## Overview

This application allows organisations to upload documents and query them using natural language. It supports **global** (cross-organisation) and **local** (per-organisation) knowledge bases, hybrid vector + keyword retrieval, and multi-language answers powered by Groq LLMs and Jina embeddings.

---

## Features

- 🔐 **JWT Authentication** — Signup, login, logout with Bearer token
- 👥 **Role-Based Access Control (RBAC)** — Super Admin, Admin, User
- 🏢 **Multi-Tenant** — Org-scoped document isolation
- 📄 **Multi-Format Document Ingestion** — PDF (text + scanned/OCR), DOCX, PPTX, XLSX, plain text, images, HTML
- 🔍 **Hybrid Retrieval** — Configurable vector + keyword weight scoring
- 🌍 **Multi-Language RAG** — Query and receive answers in any language
- 💬 **Chat Interface** — Streaming-style staged responses (Embedding → Retrieving → Generating)
- 📊 **Admin Dashboard** — User and document management per organisation
- 🛡️ **Super Admin Panel** — Global user and document oversight
- ⚡ **Redis Session Store** — Fast local session caching
- 🐳 **Fully Dockerised** — Three-service compose setup (frontend, backend, Redis)

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, React Query, React Router v7 |
| **Backend** | FastAPI, Python 3.11, LangChain Text Splitters, Uvicorn |
| **LLM** | Groq API |
| **Embeddings** | Jina AI |
| **Vector DB** | Supabase (pgvector) |
| **Relational DB** | Neon (PostgreSQL) |
| **Session Cache** | Redis |
| **OCR** | Tesseract + pdf2image + Poppler |
| **Auth** | JWT (python-jose + bcrypt) |
| **Container** | Docker + Docker Compose, Nginx |

---

## Architecture

```
Browser
   │
   ▼
Nginx (port 5173 → 80)
   │  serves static React build
   │  proxies /api/ → backend:7000
   ▼
FastAPI Backend (port 7000)
   ├── Auth (JWT)
   ├── Upload → Supabase Storage + pgvector
   ├── Query  → Jina embed → pgvector search → Groq LLM
   ├── Admin  → Neon PostgreSQL
   └── Redis  → local session cache (TTL 3600s)
```

---

## Roles & Permissions

| Action | User | Admin | Super Admin |
|---|:---:|:---:|:---:|
| Sign up / Login | ✅ | ✅ | ✅ |
| Query (global / local / both) | ✅ | ✅ | ✅ |
| Upload documents | ✅ | ✅ | ✅ |
| View org users & documents | ❌ | ✅ | ✅ |
| Delete org users & documents | ❌ | ✅ | ✅ |
| View ALL users & documents | ❌ | ❌ | ✅ |
| Delete any user or document | ❌ | ❌ | ✅ |

> One Admin per organisation and one Super Admin globally are enforced at the database level.

---

## API Reference

Base URL: `/api/v1`

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register a new user |
| `POST` | `/auth/login` | Login, returns JWT |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/auth/me` | Get current user info |

### Upload
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/upload/consent` | Get upload consent message |
| `POST` | `/upload/document` | Upload a document (`global` or `local`) |

### Query
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/query` | RAG query with configurable retrieval settings |

**Query body example:**
```json
{
  "query": "What is the refund policy?",
  "upload_mode": "global",
  "top_k": 5,
  "vector_weight": 0.7,
  "keyword_weight": 0.3,
  "language": "English",
  "system_prompt": null
}
```

### Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/users` | List users in org |
| `DELETE` | `/admin/users/{user_id}` | Delete a user |
| `GET` | `/admin/documents` | List documents in org |
| `DELETE` | `/admin/documents/{doc_id}` | Delete a document |

### Super Admin
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/super-admin/users` | List all users globally |
| `DELETE` | `/super-admin/users/{user_id}` | Delete any user |
| `GET` | `/super-admin/documents` | List all documents globally |
| `DELETE` | `/super-admin/documents/{doc_id}` | Delete any document |

### Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |

---

## Project Structure

```
global_rag_application-/
├── backend_server/
│   ├── main.py               # FastAPI app — all routes, models, logic
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile
│
├── client/
│   ├── src/
│   │   ├── api/              # API client, fetch wrappers, typed endpoints
│   │   ├── app/              # Providers (Auth, React Query, Theme)
│   │   ├── components/       # Reusable UI (Button, Input, Badge, Sheet…)
│   │   ├── features/         # Page-level features
│   │   │   ├── auth/         # Login / Signup
│   │   │   ├── chat/         # RAG chat interface
│   │   │   ├── upload/       # Document upload
│   │   │   ├── admin/        # Admin dashboard
│   │   │   └── super-admin/  # Super Admin panel
│   │   └── styles/           # Global CSS + theme tokens
│   ├── nginx.conf            # Nginx reverse proxy config
│   ├── vite.config.ts
│   └── Dockerfile
│
├── redis_database/
│   ├── redis.conf
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Environment Variables

### Backend — `backend_server/.env`

```env
JWT_SECRET_KEY=your-secret-key

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEON_DATABASE_URL=postgresql://user:password@ep-host.region.aws.neon.tech/dbname?sslmode=require

GROQ_API_KEY=your-groq-api-key
JINA_API_KEY=your-jina-api-key

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Set automatically by docker-compose
REDIS_URL=redis://redis_db:6379
```

### Frontend — `client/.env.production`

```env
VITE_API_BASE_URL=/api/v1
```

> **Note:** In Docker, the frontend uses a relative base URL. Nginx proxies `/api/` to the backend container — no IP or port needed in the env file.

---

## Getting Started

### Prerequisites

- Docker & Docker Compose installed on your VPS/server
- Supabase project with pgvector enabled
- Neon PostgreSQL database
- Groq API key
- Jina AI API key

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/Jiyansh2009-Rana/global_rag_application-.git
cd global_rag_application-

# 2. Set up backend env
cp backend_server/.env.example backend_server/.env
# Fill in your keys in backend_server/.env

# 3. Run backend locally
cd backend_server
pip install -r requirements.txt
uvicorn main:app --reload --port 7000

# 4. Run frontend locally (in a separate terminal)
cd client
npm install
npm run dev
# Vite dev server runs on http://localhost:5173
# Vite proxies /api → localhost:7000 automatically
```

---

## Docker Deployment

```bash
# 1. Clone the repo on your VPS
git clone https://github.com/Jiyansh2009-Rana/global_rag_application-.git
cd global_rag_application-

# 2. Create backend env file
nano backend_server/.env
# Add all required environment variables (see above)

# 3. Create frontend production env file
echo "VITE_API_BASE_URL=/api/v1" > client/.env.production

# 4. Build and start all services
docker-compose up --build -d

# 5. Check services are running
docker-compose ps
docker-compose logs -f
```

### Services after deployment

| Service | Container | Port |
|---|---|---|
| Frontend (Nginx) | `frontend_client` | `5173` → `80` |
| Backend (FastAPI) | `backend_server` | `7000` (internal only) |
| Redis | `redis_database` | `6379` (internal only) |

> ⚠️ Only port `5173` needs to be open publicly. Keep ports `7000` and `6379` firewalled.

### Firewall recommendation (UFW)

```bash
ufw allow 22      # SSH
ufw allow 5173    # App
ufw deny 7000     # Block backend direct access
ufw deny 6379     # Block Redis direct access
ufw enable
```