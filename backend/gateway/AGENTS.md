# AGENTS.md — NestJS Gateway (`backend/gateway`)

Main backend of the AI-Powered Project Management Tool: authentication and authorization, projects, tasks, users, background jobs, communication with the AI service, and the public API for third-party integrations.

## Tech Stack

NestJS + TypeScript · Drizzle ORM · PostgreSQL · Redis + BullMQ · JWT + API Keys + OAuth

## Folder Structure

```
backend/gateway/
├── src/
│   ├── modules/     # Feature modules (auth, projects, tasks, users, ...)
│   ├── common/      # Guards, interceptors, filters, decorators, DTOs
│   ├── config/      # Configuration
│   ├── database/    # Drizzle schema & client
│   ├── jobs/        # BullMQ processors
│   └── main.ts
├── drizzle/         # Migrations
├── test/
└── package.json
```

## Scope

- Work only inside `backend/gateway/`. Never modify `backend/workflow/` or `frontend/`.
- TypeScript only. No Python and no AI agent logic here (that belongs in `backend/workflow/`).

## Rules

1. **Architecture**
   - Modular NestJS: one feature = one module; do not bypass the module system.
   - Thin controllers; business logic in services; keep services testable.
   - Validate all input with DTOs + `class-validator`.
2. **Database**: Drizzle ORM only (no Prisma/TypeORM). Keep the schema clean and normalized.
3. **Authentication**: support JWT (users), API Keys (third-party/public access), and OAuth. Expose the current user / API key via custom decorators. Implement authentication using passportjs
4. **AI service communication**
   - Use **BullMQ** for async and long-running AI tasks.
   - Use HTTP only for real-time needs (e.g. AI chat).
   - Always use typed DTOs/contracts that mirror the Pydantic schemas in `backend/workflow/`.
5. **Background jobs**: all heavy or delayed work (emails, notifications, AI jobs) goes through BullMQ.
6. **Code quality**
   - Clean, modular, production-ready; clarity over cleverness.
   - Strict typing, no `any`.
   - Centralize error handling with exception filters.
   - Use `ConfigService` for all configuration; never hardcode secrets or config values.
7. **Naming**: kebab-case files, PascalCase classes, camelCase variables and methods.
## Test 
- Always write test cases before writing the application code. Write unit , integration, e2e test cases for all the modules and utils.
- Always save the test files in /test folder. For example /authentication/test or product/test folders.

## Commands

```bash
npm run start:dev   # run in watch mode
npm run test        # unit tests
npm run test:e2e    # e2e tests
```

## Current Focus

- Solid foundation for Auth, Projects, and Tasks
- Clean BullMQ integration with the AI orchestration service
- Public API readiness
