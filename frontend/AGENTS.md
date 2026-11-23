# AGENTS.md — Next.js Frontend

## Role

You are working inside the **Next.js frontend** (`frontend/`) of the AI-Powered Project Management Tool. It talks only to the NestJS gateway (`/api/v1`). It never calls the AI workflow service directly.

---

## Tech Stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS
- shadcn/ui (components live in `src/components/ui`)
- TanStack Query (all server state)
- TanStack Form + Zod (forms and validation)
- Sonner via shadcn (toasts)
- react-icons (icons)

**Not allowed:** `axios`, `react-hook-form`, `@hookform/resolvers`, other icon libraries (lucide-react, heroicons, etc.), other toast libraries, CSS modules, styled-components.

---

## Folder Structure (Expected)

```
frontend/
├── src/
│   ├── app/                 # Routes, layouts, loading/error files
│   ├── components/
│   │   ├── ui/              # shadcn generated components
│   │   └── <feature>/       # Feature-specific components
│   ├── features/<feature>/  # api.ts, queries.ts, schemas.ts, types.ts
│   ├── lib/                 # api client, query client, utils (cn)
│   ├── hooks/               # Shared hooks
│   ├── providers/           # QueryProvider, etc.
│   └── types/               # Shared global types
├── public/
└── package.json
```

---

## Rules

1. **Only work inside `frontend/`.** Never touch `backend/` from here.

2. **Components**
   - Use shadcn components first. Add new ones with `npx shadcn@latest add <name>`.
   - Style with Tailwind and the `cn()` helper. No inline styles, no other styling systems.
   - Default to Server Components. Add `"use client"` only when state, effects, or browser APIs are needed, and keep client components small and at the leaves.
   - One component per file, PascalCase component names, kebab-case file names.

3. **Icons**
   - Use `react-icons` only. Import from a specific pack path (e.g. `react-icons/lu`), never from the root package.
   - Stay consistent: prefer one pack (Lucide, `lu`) across the app.

4. **Data fetching: TanStack Query + native `fetch`**
   - No axios. All HTTP goes through the typed wrapper in `src/lib/api-client.ts` (base URL `NEXT_PUBLIC_API_URL`, `credentials: "include"`, Bearer access token, one shared error type).
   - Per feature: `api.ts` (raw calls), `queries.ts` (`useQuery`/`useMutation` hooks and query-key factories), `schemas.ts`, `types.ts`.
   - Components never call `fetch` directly. They use the feature hooks.
   - Query keys come from a per-feature key factory, never inline arrays.
   - Invalidate or update the cache in mutation `onSuccess`. Handle loading, error, and empty states explicitly.
   - Parse API responses with the Zod schema so runtime data matches the types.

5. **Forms**
   - Build forms with shadcn's `Field` components (`Field`, `FieldGroup`, `FieldLabel`, `FieldError`) and **TanStack Form** with the Zod schema as the validator.
   - No `react-hook-form`.
   - Reuse the same Zod schema for validation and for the inferred type. Field rules should mirror the gateway DTOs.
   - Disable the submit button while submitting. Show server errors in the form or a toast.

6. **Validation and types**
   - Zod is the single source of truth. Derive types with `z.infer<typeof schema>`, never hand-write a duplicate type.
   - TypeScript strict. No `any`, no `@ts-ignore`, no non-null `!` assertions. Use `unknown` and narrow.
   - Type all props, hooks, and API functions explicitly. Prefer `type` for shapes and unions, and avoid enums in favor of `as const` objects.
   - Keep types close to the feature. Put only truly shared types in `src/types/`.

7. **Notifications**
   - Use shadcn **Sonner**. Mount `<Toaster />` once in the root layout and call `toast.success()`, `toast.error()` and `toast.promise()` from `sonner`.
   - Toast on mutation outcomes. Do not toast for plain query loading states.

8. **Auth**
   - The access token lives in memory only. Never in `localStorage` or `sessionStorage`.
   - The refresh token is an httpOnly cookie managed by the gateway. On a 401 the API client calls `/authentication/refresh` once, retries the request, and otherwise redirects to login.
   - The gateway runs on port 3000, so the frontend dev server runs on **3001**.

9. **Config**
   - All env access goes through one typed module (`src/lib/env.ts`, validated with Zod). Only `NEXT_PUBLIC_*` values are exposed to the browser. Never hardcode URLs or secrets.

10. **Code quality**
    - Clean, modular, production-ready. Clarity over cleverness.
    - Accessible by default (labels, focus states, keyboard support). shadcn handles most of it, so do not break it.
    - No dead code, no `console.log` in committed code.

11. **Documentation**
    - After finishing a feature, delegate to the `code-documenter` agent. Frontend changes are documented on the **AI Project Management Tool - frontend codebase docs** Notion page.

---

## Preferred Patterns

- Colocate feature code and keep route files in `app/` thin.
- Compose small components instead of long prop lists.
- Use `useMutation` for writes and `useQuery` for reads, never `useEffect` for fetching.
- Use `Suspense` and `loading.tsx` for route-level loading, skeletons for component-level loading.

---

## What You Should Not Do

- Do not add libraries from the not-allowed list.
- Do not duplicate types that Zod already infers.
- Do not fetch inside components or effects, and do not bypass the API client.
- Do not put business or AI agent logic in the frontend.
- Do not edit generated shadcn files beyond small, necessary adjustments.

---

## Current Focus

- Auth screens (register, login, Google, verify email, reset password)
- Project and task management UI
- AI features (task breakdown, chat, reports)