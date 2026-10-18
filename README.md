# Enterprise Knowledge Platform

A learning-first enterprise knowledge platform — upload internal documents, search them with keyword retrieval, and evolve into a grounded RAG assistant.

> Built according to the documentation in `enterprise-knowledge-platform-docs/`.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS v4 |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (pgvector/pgvector:pg17) |
| ORM | Prisma 7 |
| File uploads | Multer |
| PDF extraction | pdf-parse |
| Authentication | JWT + bcrypt |

## Prerequisites

Install:

- Node.js LTS
- Docker Desktop
- Git

## Quick start

### 0. Configure the server

From the repository root, copy `.env.example` to `server/.env` if you have not configured it already. The server and Prisma load environment settings from that file. Keep the example values for a local Docker setup, and use a private `JWT_SECRET` with at least 32 characters for a deployed environment.

```powershell
if (-not (Test-Path server/.env)) { Copy-Item .env.example server/.env }
```

### 1. Start the database

```powershell
docker compose up -d
```

### 2. Generate the Prisma client and run the database migration

```powershell
cd server
npm run db:generate
npx prisma migrate dev --name init
```

### 3. Start the backend

```powershell
cd server
npm run dev
```

### 4. Start the frontend

```powershell
cd client
npm run dev
```

Then open http://localhost:5173

### Demo access and sample documents

In local development, the sign-in page offers **Continue as guest** and **Admin demo**. The first demo sign-in creates a separate `Hank Sample Workspace` and adds four sample text documents covering leave, onboarding, expenses, and security incidents. Guest access can search and view sources; admin demo can manage the sample workspace. Demo access is disabled in production unless `ENABLE_DEMO_ACCESS=true` is set explicitly; set `ENABLE_DEMO_ACCESS=false` to disable it in other environments.

### Production deployment

Build the client with `cd client && npm ci && npm run build`, then run the server with `NODE_ENV=production npm start`. The server serves the built client and API from one origin when `client/dist` exists. Configure a private `JWT_SECRET` of at least 32 characters, `DATABASE_URL`, and `CLIENT_ORIGINS` for your deployed origin, then apply migrations with `cd server && npx prisma migrate deploy`. Use PostgreSQL with pgvector for semantic retrieval; keyword retrieval remains available without the vector extension or embedding key.

## Project structure

```
enterprise-knowledge-platform/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/layout/   # Navbar, AppLayout, ProtectedRoute
│       ├── context/             # AuthContext
│       ├── lib/                 # Axios instance
│       └── pages/               # AuthPage, AskPage, KnowledgeBasePage
├── server/                 # Express backend
│   ├── prisma/              # Schema + migrations
│   └── src/
│       ├── controllers/    # authController, documentController, searchController
│       ├── middleware/     # auth.js (JWT), errorHandler.js
│       ├── routes/         # auth.js, documents.js, search.js
│       ├── lib/            # prisma.js singleton
│       ├── utils/          # errors.js
│       └── app.js
├── docker-compose.yml
└── .env.example
```

## API

- `GET /health` — process liveness check
- `GET /ready` — database readiness check (returns 503 when the database is unreachable)
- `POST /api/auth/register` — register + creates organization
- `POST /api/auth/login` — returns JWT
- `GET /api/auth/demo-status` — reports whether demo access is enabled
- `POST /api/auth/demo` — provisions sample data and returns guest or admin demo access
- `GET /api/auth/me` — current user (protected)
- `POST /api/documents` — upload PDF/TXT (multipart/form-data)
- `GET /api/documents` — list org documents
- `GET /api/documents/:id` — get document
- `DELETE /api/documents/:id` — delete document
- `GET /api/search?q=query&mode=hybrid` — hybrid, semantic, or keyword retrieval with citations

## Phases

- **Phase 1 ✅** — Foundation: React, Express, PostgreSQL, Prisma, health check
- **Phase 2 ✅** — Knowledge base: Auth, orgs, document upload, PDF extraction, chunking, keyword search
- **Phase 3 ✅** — RAG foundation: pgvector embeddings, semantic retrieval, hybrid search, citations
- **Phase 4** — Production: Redis/BullMQ, background workers, RBAC, audit logs, rate limiting
- **Phase 5** — Optional AI: LLM generation, grounded prompts, agent orchestration
