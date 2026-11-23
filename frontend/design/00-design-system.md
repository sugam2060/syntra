# 00 — Syntra Design System (master prompt)

Single source of truth for every Stitch prompt in this folder. Each page prompt (`01-…` onward) must be pasted **after** the "Stitch preamble" below, so every generated screen shares the same look, tokens and components.

## How to use with Stitch

1. Paste the **Stitch preamble** (section 1) into a new Stitch prompt.
2. Paste the page prompt (the fenced "Prompt" block of one page file) right below it.
3. Generate desktop (1440 px) first, then ask Stitch for the mobile (390 px) variant of the same screen.
4. If Stitch drifts from the tokens, re-paste the preamble and say "keep the exact tokens above".

---

## 1. Stitch preamble (paste first, every time)

```
Design for "Syntra", an AI-native project management web app for small engineering and product teams (2–15 people). Think Linear's calm density, Notion's readability and a restrained AI layer. Product is a SaaS web app, desktop-first, fully responsive.

VISUAL STYLE
- Clean, modern, quiet. Lots of whitespace, thin 1px borders, almost no shadows, no gradients except the AI accent (see below). Never use stock illustrations; use simple line icons (Lucide style, 1.5px stroke, 16/20px).
- Font: Geist Sans for UI, Geist Mono for ids, keys, code and numbers in tables. Base size 14px, line-height 1.5.
- Corner radius: 6px for inputs and buttons, 10px for cards and panels, 999px for pills and avatars.

COLOR TOKENS (light / dark)
- background: #FFFFFF / #0B0B0F
- surface (cards, panels): #FAFAFB / #121218
- surface-raised (menus, dialogs): #FFFFFF / #181820
- border: #E6E6EB / #26262F
- text: #14141A / #EDEDF2
- text-muted: #6B6B78 / #9A9AA8
- primary (actions, links, focus): #4F46E5 / #7C74F5, hover darker 8%
- ai accent (ONLY for AI features): violet #8B5CF6 with a soft gradient #8B5CF6 → #6366F1 and a small sparkle icon
- success #16A34A, warning #D97706, danger #DC2626, info #0284C7 (each with a 10% tinted background for badges)
- Status colors: Backlog #9A9AA8, Todo #64748B, In Progress #2563EB, In Review #D97706, Done #16A34A
- Priority colors: Low #64748B, Medium #0284C7, High #D97706, Urgent #DC2626 (icon + label, never color alone)
- Provide both a light theme and a dark theme; show light by default.

LAYOUT SHELL (authenticated screens)
- Left sidebar 248px, collapsible to a 64px icon rail: workspace switcher at top, nav (Home, Projects, My tasks, AI Chat, Reports), a "Pinned projects" list, then Members, API keys, Settings at the bottom, user avatar menu last.
- Top bar 56px: breadcrumb on the left, global search (⌘K) in the middle, "New task" primary button and notification bell on the right.
- Content max width 1200px (full width for boards), 24px page padding, 8px spacing grid.

COMPONENT RULES
- Buttons: primary (filled indigo), secondary (border), ghost, destructive; 32px high (36px in forms); icon-leading allowed.
- Inputs: 36px high, 1px border, 2px indigo focus ring, label above, helper text below, inline error in danger color with an icon.
- Badges: pill, tinted background, 12px text. Avatars: 24px in dense rows, 32px elsewhere, initials fallback.
- Tables/lists: 40px rows, hover highlight, sticky header, no zebra stripes.
- Cards: surface color, 1px border, 10px radius, 16px padding.
- Every AI element carries the violet sparkle and the label "AI"; AI output is always shown as an editable draft with Accept / Edit / Regenerate controls.
- Always design the states that matter: loading (skeletons, not spinners), empty (one icon, one sentence, one button), error (inline, with retry) and disabled.

ACCESSIBILITY
- WCAG AA contrast, visible focus rings, 40px minimum touch targets on mobile, full keyboard operation, status and priority never conveyed by color alone.

TONE OF COPY
- Short, plain, human. Sentence case. No exclamation marks. Realistic sample data: a product team of five people shipping a mobile app, tasks like "Design onboarding flow", "Set up CI pipeline", "Fix Safari login bug".
```

---

## 2. Design tokens (reference for implementation)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#0B0B0F` | App canvas |
| `--surface` | `#FAFAFB` | `#121218` | Cards, sidebar, panels |
| `--surface-raised` | `#FFFFFF` | `#181820` | Menus, popovers, dialogs |
| `--border` | `#E6E6EB` | `#26262F` | All dividers and outlines |
| `--text` | `#14141A` | `#EDEDF2` | Body and headings |
| `--text-muted` | `#6B6B78` | `#9A9AA8` | Secondary text, placeholders |
| `--primary` | `#4F46E5` | `#7C74F5` | Primary actions, focus, links |
| `--ai` | `#8B5CF6` | `#A78BFA` | AI-only accents |
| `--success` / `--warning` / `--danger` / `--info` | `#16A34A` / `#D97706` / `#DC2626` / `#0284C7` | same, 10% tinted bg | Feedback |

Typography scale: Display 28/36 semibold · H1 22/30 semibold · H2 18/26 semibold · H3 15/22 semibold · Body 14/21 · Small 12/18 · Mono 13/20.
Spacing: 4, 8, 12, 16, 24, 32, 48. Radius: 6, 10, 999. Motion: 120–180 ms ease-out, none when `prefers-reduced-motion`.
Maps to the existing frontend stack: Next.js (App Router), Tailwind CSS v4 (`@theme` tokens in `app/globals.css`), Geist fonts already loaded in `app/layout.tsx`.

---

## 3. Shared patterns every page must follow

**Roles and permissions (from the gateway).** Workspace roles are Owner, Admin, Member, Viewer. Permission codes drive what the UI shows: `workspace:read|update|delete`, `member:invite|remove|update_role`, `project:read|create|update|delete`, `task:read|create|update|delete|assign`, `comment:create`, `ai:use`, `ai:manage_keys`. Controls the user may not use are **hidden** when the whole feature is off-limits and **disabled with a tooltip** ("You need the Admin role") when the feature is visible but the action is not.

**Auth model.** Email + password and Google sign-in. A new account must verify its email before it can sign in. Errors use the gateway shape `{ statusCode, error, message }`; the UI shows `message` inline. Rate-limited auth routes can answer 429: show "Too many attempts. Try again in a minute."

**AI pattern.** AI actions are always opt-in buttons with the sparkle icon. Results appear as a draft the user can accept, edit or regenerate. Long jobs (status report) show a progress card ("Generating report…") and arrive as a notification.

**Navigation map.**

```
/login /register /verify-email /forgot-password /reset-password /auth/callback
/onboarding                          (create or join workspace)
/w/:workspace                        Home
/w/:workspace/projects               Projects
/w/:workspace/projects/:id           Board | List  (tabs)
/w/:workspace/projects/:id/chat      AI Project Chat
/w/:workspace/reports                Status reports
/w/:workspace/members                Members & invitations
/w/:workspace/settings               Workspace settings
/w/:workspace/settings/api-keys      API keys
/account                             Account & security
```

**Backend readiness (shown in each page file).** ✅ = endpoint exists in `backend/gateway` today. 🕓 = planned in the Notion docs, endpoint not built yet. Design all pages, but tag 🕓 data as sample data when wiring up.

---

## 4. Page prompt index

| # | File | Screen | Backend |
|---|---|---|---|
| 01 | `01-sign-in.md` | Sign in | ✅ |
| 02 | `02-register.md` | Create account + check-your-email | ✅ |
| 03 | `03-verify-email.md` | Verify email states + resend | ✅ |
| 04 | `04-forgot-reset-password.md` | Forgot and reset password | ✅ |
| 05 | `05-onboarding-workspace.md` | Create / join workspace | 🕓 |
| 06 | `06-home-dashboard.md` | Workspace home | 🕓 |
| 07 | `07-projects-list.md` | Projects list and create dialog | 🕓 |
| 08 | `08-project-board.md` | Kanban board + filters | 🕓 |
| 09 | `09-project-list-view.md` | List view | 🕓 |
| 10 | `10-task-detail-ai-breakdown.md` | Task detail + AI task breakdown | 🕓 |
| 11 | `11-ai-project-chat.md` | AI project chat | 🕓 |
| 12 | `12-status-report.md` | AI weekly status report | 🕓 |
| 13 | `13-members-invitations.md` | Members, roles, invitations | 🕓 (schema ✅) |
| 14 | `14-api-keys.md` | API keys management | ✅ |
| 15 | `15-account-security.md` | Account, password, Google link | ✅ |
| 16 | `16-workspace-settings.md` | Workspace settings | 🕓 |
