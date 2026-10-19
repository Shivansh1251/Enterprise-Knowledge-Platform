# Hank — Enterprise Knowledge Platform

Hank helps teams search their internal knowledge base and find the passages behind an answer. Upload PDF or TXT documents, ask a question in plain language, and review matching sources with citations. Search supports keyword, semantic, and hybrid retrieval.

> **Project screenshot:** [View `client/public/example.png`](client/public/example.png). Add or replace this file with the latest screenshot when it is ready.

## What Hank can do

- Register and sign in, with organization-scoped access to documents.
- Upload, index, search, and remove PDF or TXT documents.
- Search with keyword, semantic, or hybrid retrieval and open source passages.
- Use a guest or admin demo workspace populated with sample documents during local development.
- Switch between light and dark themes and use responsive layouts.

Hank uses the configured Ollama model for greetings, general messages, and answers grounded in retrieved document passages. Ollama runs on the machine hosting the backend; no hosted LLM API key is needed for chat. OpenAI embeddings remain optional for semantic and hybrid retrieval. The Incognito control switches the interface to a black-and-white appearance and does not change the chat or search providers.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Styling and animation | CSS, Tailwind CSS v4, Motion for React |
| Backend | Node.js + Express.js |
| Database | PostgreSQL with pgvector support |
| ORM | Prisma 7 |
| File uploads | Multer |
| PDF extraction | pdf-parse |
| Authentication | JWT + bcrypt |

## Prerequisites

- Node.js LTS
- Docker Desktop
- Git
- [Ollama](https://ollama.com/download) for local assistant replies

## Quick start

### 1. Configure the server

From the repository root, copy `.env.example` to `server/.env` if you have not configured it already. The server and Prisma load environment settings from that file. Keep the example values for a local Docker setup, and use a private `JWT_SECRET` with at least 32 characters for a deployed environment.

```powershell
if (-not (Test-Path server/.env)) { Copy-Item .env.example server/.env }
```

### 2. Start the database

```powershell
docker compose up -d
```

### 3. Generate the Prisma client and run the database migration

```powershell
cd server
npm install
npm run db:generate
npx prisma migrate dev --name init
```

### 4. Start the backend

```powershell
cd server
npm run dev
```

### 5. Start the frontend

In a second terminal:

```powershell
cd client
npm install
npm run dev
```

Open <http://localhost:5173>.

Before chatting, download a local model and keep Ollama running:

```powershell
ollama pull gemma3:1b
```

The server defaults to `http://127.0.0.1:11434` and the `gemma3:1b` model. Change `OLLAMA_BASE_URL` or `OLLAMA_MODEL` in `server/.env` if your local Ollama setup differs. Without Ollama running or the model installed, Hank will show a setup message when you send a chat turn.

### Demo access and sample documents

In local development, the sign-in page offers **Continue as guest** and **Admin demo**. The first demo sign-in creates a separate `Hank Sample Workspace` and adds four sample text documents covering leave, onboarding, expenses, and security incidents. Guest access can search and view sources; admin demo can manage the sample workspace. Demo access is disabled in production unless `ENABLE_DEMO_ACCESS=true` is set explicitly. Set `ENABLE_DEMO_ACCESS=false` to disable it in other environments.

## Production deployment

Build the client with `cd client && npm ci && npm run build`, then run the server with `NODE_ENV=production npm start`. The server serves the built client and API from one origin when `client/dist` exists. Configure a private `JWT_SECRET` of at least 32 characters, `DATABASE_URL`, `CLIENT_ORIGINS`, and a reachable Ollama instance for your deployed origin, then apply migrations with `cd server && npx prisma migrate deploy`. Use PostgreSQL with pgvector for semantic retrieval; keyword retrieval remains available without the vector extension or embedding key.

## Project structure

```text
enterprise-knowledge-platform/
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/      # Shared UI, layout, and feedback components
│       ├── context/         # Authentication, theme, and toast state
│       ├── lib/             # API client
│       └── pages/           # Sign-in, Ask Hank, and knowledge base pages
├── server/                 # Express backend
│   ├── prisma/              # Schema + migrations
│   └── src/
│       ├── controllers/     # Authentication, documents, and search
│       ├── middleware/      # JWT authentication and error handling
│       ├── routes/          # API routes
│       ├── lib/             # Prisma client
│       └── app.js
├── docker-compose.yml
└── .env.example
```

## API

- `GET /health` — process liveness check
- `GET /ready` — database readiness check (returns 503 when the database is unreachable)
- `POST /api/auth/register` — register and create an organization
- `POST /api/auth/login` — sign in and return a JWT
- `GET /api/auth/demo-status` — report whether demo access is enabled
- `POST /api/auth/demo` — provision sample data and return guest or admin demo access
- `GET /api/auth/me` — get the current user (protected)
- `POST /api/chat` — Ollama reply with organization-scoped source retrieval using the selected search mode
- `POST /api/documents` — upload PDF/TXT (`multipart/form-data`)
- `GET /api/documents` — list organization documents
- `GET /api/documents/:id` — get a document
- `DELETE /api/documents/:id` — delete a document
- `GET /api/search?q=query&mode=hybrid` — hybrid, semantic, or keyword retrieval with citations

## Project phases

- **Phase 1 ✅** — Foundation: React, Express, PostgreSQL, Prisma, health check
- **Phase 2 ✅** — Knowledge base: authentication, organizations, document upload, PDF extraction, chunking, keyword search
- **Phase 3 ✅** — Retrieval foundation: pgvector embeddings, semantic retrieval, hybrid search, citations
- **Phase 4** — Production hardening: Redis/BullMQ, background workers, RBAC, audit logs, rate limiting
- **Phase 5** — Optional AI: local Ollama replies and grounded answer generation are available; agent orchestration remains future work

## Contributing

Contributions are welcome. Open an issue to discuss a larger change, then submit a pull request with a focused description of the problem and solution. Keep changes small, use clear names, validate external input, keep secrets out of source control, and consider authorization and loading/error states when changing behavior.

Before submitting, run the relevant checks from the `client/` or `server/` directory and describe what you verified. Use a clear commit message, for example:

```text
feat: add document upload endpoint
fix: enforce organization document access
refactor: move retrieval logic into service
```

## Code of Conduct

Help keep Hank and its contributor community welcoming and constructive. Treat people with respect, give feedback about ideas and code rather than individuals, and make room for different backgrounds and experience levels. Harassment, discrimination, personal attacks, and disruptive behavior are not acceptable. Report conduct concerns privately through the repository owner’s GitHub profile below.

## License

Hank is licensed under the [ISC License](LICENSE).

## Connect with me

- **GitHub:** [@Shivansh1251](https://github.com/Shivansh1251)
- **Project issues and ideas:** [Open an issue](https://github.com/Shivansh1251/Enterprise-Knowledge-Platform/issues)
