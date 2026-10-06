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

### 1. Start the database

```powershell
docker compose up -d
```

### 2. Run database migration

```powershell
cd server
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

- `GET /health` — health check
- `POST /api/auth/register` — register + creates organization
- `POST /api/auth/login` — returns JWT
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
