# AGENTS.md — AI Orchestrator (`backend/workflow`)

Python service that owns all AI logic for the AI-Powered Project Management Tool: multi-agent workflows (LangGraph), task breakdown, AI chat, report generation, RAG over project data, and the AI API used internally and by third-party tools.

## Tech Stack

Python 3.12+ · uv · FastAPI · LangGraph + LangChain · PostgreSQL + pgvector · Redis (state, if needed) · Pydantic v2

## Folder Structure

```
backend/workflow/
├── app/
│   ├── agents/      # One agent = one responsibility
│   ├── graphs/      # LangGraph workflows
│   ├── tools/       # Tools used by agents (separate from agents)
│   ├── services/    # Business logic
│   ├── api/         # FastAPI routers
│   ├── core/        # Config, security, events
│   ├── models/      # Pydantic schemas (inputs, outputs, contracts)
│   └── main.py
├── tests/
├── pyproject.toml
├── uv.lock
└── README.md
```

## Scope

- Work only inside `backend/workflow/`. Never modify `backend/gateway/` or `frontend/`.
- Python only. No NestJS/TypeScript code here.

## Rules

1. **Packages**: use `uv add`, `uv remove`, `uv sync`, `uv run`. Never plain `pip`.
2. **Architecture**
   - Keep agents and graphs small and modular; no giant monolithic graphs.
   - One agent = one responsibility. Do not mix RAG, chat, and task breakdown in one agent.
   - Use LangGraph for multi-step / multi-agent flows.
   - Use Pydantic models for all inputs and outputs, including structured LLM outputs.
3. **Communication**
   - Async jobs arrive via **BullMQ** from the NestJS gateway.
   - Expose HTTP endpoints only for real-time use cases (e.g. AI chat) and the public AI API.
   - Define every contract as a Pydantic schema in `app/models/`.
4. **Prompts**: keep them in separate files or well-organized constants. No business logic inside prompts.
5. **Code quality**
   - Type hints everywhere; simple, explicit, production-ready code.
   - Follow FastAPI and LangGraph best practices (check Context7 for current docs).
   - Use dependency injection where it fits.
   - Log important steps of agent execution; keep agents testable and observable.
6. **Config**: no hardcoded secrets or environment-specific values; read from `app/core/` config.

## Commands

```bash
uv sync                                           # install dependencies
uv run uvicorn app.main:app --reload --port 8000  # run the service
uv add <package>                                  # add a dependency
uv run pytest                                     # run tests
```

## Current Focus

- Reliable multi-agent workflows, especially task breakdown
- Event-driven integration with the NestJS gateway via BullMQ
- Foundation for RAG and AI chat
- Standalone API readiness for third-party project management tools
