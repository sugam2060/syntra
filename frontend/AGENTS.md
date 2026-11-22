# AGENT.md — NestJS Gateway

## Role

You are working inside the **NestJS Gateway** service (`backend/gateway`).

This is the main backend of the AI-Powered Project Management Tool. It handles:

- Authentication & Authorization (JWT + API Keys + OAuth)
- Project & Task management
- User management
- Background jobs (BullMQ)
- Communication with the AI Orchestration service
- Public API for third-party integrations

---

## Tech Stack

- NestJS + TypeScript
- Drizzle ORM
- PostgreSQL
- Redis + BullMQ
- JWT + API Keys + OAuth

---

## Folder Structure (Expected)

`
backend/gateway/

├── src/

│   ├── modules/           # Feature modules (auth, projects, tasks, users, etc.)

│   ├── common/            # Guards, interceptors, filters, decorators, dtos

│   ├── config/            # Configuration

│   ├── database/          # Drizzle schema & client

│   ├── jobs/              # BullMQ processors

│   └── main.ts

├── drizzle/

├── test/

└── package.json
`


---

## Rules

1. **Only work inside `backend/gateway/`**
   - Never touch `backend/ai-orchestration/` or `frontend/` from here.

2. **Architecture Style**
   - Follow modular NestJS architecture.
   - One feature = one module.
   - Keep controllers thin.
   - Business logic goes into services.
   - Use DTOs for all inputs.

3. **Database**
   - Use **Drizzle ORM** only.
   - Do not use Prisma or TypeORM.
   - Keep schema clean and normalized.

4. **Authentication**
   - Support JWT (for users)
   - Support API Keys (for public/third-party access)
   - Support OAuth

5. **Communication with AI Service**
   - Prefer **BullMQ** (event-driven) for async / long-running AI tasks.
   - Use HTTP only for real-time needs (e.g. AI chat).
   - Always use clear DTOs/contracts when talking to the AI service.

6. **Background Jobs**
   - All heavy or delayed work (emails, notifications, AI jobs) must go through BullMQ.

7. **Code Quality**
   - Clean, modular, production-ready code.
   - Prefer clarity over cleverness.
   - Use proper typing (avoid `any`).
   - Follow NestJS best practices.

8. **Naming Conventions**
   - Use kebab-case for file names.
   - Use PascalCase for classes.
   - Use camelCase for variables and methods.

---

## Preferred Patterns

- Use `ConfigService` for all configuration.
- Use custom decorators for current user / API key.
- Centralize error handling with exception filters.
- Validate all incoming data with DTOs + class-validator.
- Keep services testable.

---

## What You Should Not Do

- Do not put AI agent logic here (that belongs in `ai-orchestration`).
- Do not create fat controllers.
- Do not hardcode secrets or config values.
- Do not bypass the module system.

---

## Current Focus

- Solid foundation for Auth, Projects, and Tasks
- Clean integration with AI Orchestration service via BullMQ
- Public API readiness
