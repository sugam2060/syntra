# CLAUDE.md

@backend/gateway/AGENTS.md
@backend/workflow/AGENTS.md

## Project Overview

**AI-Powered Project Management Tool.** AI agents are usable inside the app and through a public API for third-party project management tools.

## Project Structure

```
/
├── frontend/            # Next.js application
├── backend/
│   ├── gateway/         # NestJS: API, auth, projects, tasks, background jobs
│   └── workflow/        # Python: FastAPI + LangGraph + LangChain (AI agents)
├── docker-compose.yml
└── CLAUDE.md
```

## Tech Stack

| Layer         | Technology                               |
|---------------|------------------------------------------|
| Frontend      | Next.js + TypeScript + Tailwind CSS      |
| Main backend  | NestJS + TypeScript + Drizzle            |
| AI service    | Python + FastAPI + LangGraph + LangChain |
| Database      | PostgreSQL                               |
| Cache / queue | Redis + BullMQ                           |
| Vector store  | pgvector (Pinecone later if needed)      |
| Auth          | JWT + API Keys + OAuth                   |

## Rules

1. **Respect folder boundaries**
   - NestJS/TypeScript backend code lives only in `backend/gateway/`.
   - Python/AI/LangGraph code lives only in `backend/workflow/`.
   - Frontend code lives only in `frontend/`.
   - Never mix languages across folders.
2. **Scope each change**: identify which service(s) a change affects first, then edit only those folders. Follow the `AGENTS.md` of the service you are in (imported above).
3. **Service communication**
   - **BullMQ** (event-driven) for async and long-running AI tasks.
   - **HTTP** for real-time interactions (e.g. AI chat).
   - Typed DTOs on the gateway side and Pydantic schemas on the workflow side must stay in sync.
4. **Workflow**
   - For non-trivial features, follow Plan → Implement → Review (Superpowers skills).
   - Use Context7 for current docs on NestJS, LangGraph, LangChain, Drizzle, etc.
5. **Code quality**: clean, modular, production-ready; clear names over clever ones; comment only when necessary; design for scalability and separation of concerns.

## Commands

```bash
# NestJS gateway
cd backend/gateway && npm run start:dev

# AI orchestration (uv only, never pip)
cd backend/workflow && uv run uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev
```

## Architecture Notes

- NestJS is the main entry point; the AI orchestration service is separate and independently scalable.
- The public AI agent API must be clean and well documented so other PM tools can integrate.
- Background jobs (emails, notifications, heavy AI tasks) use BullMQ + Redis.

## Current Focus

Building the MVP:

- Project and task management
- AI agents (task breakdown, chat, reports)
- Standalone AI orchestration API for third-party integration
