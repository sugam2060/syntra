# 06 — Workspace home

Route `/w/:workspace` · Backend 🕓 (projects, tasks, activity not built yet; user and workspace context ✅/🕓)

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- First screen after sign-in. Needs `workspace:read`. AI card needs `ai:use` (hide if the user lacks it).
- Data: tasks assigned to me, due soon, recent activity feed (task created, status changed, assignee changed), active projects with progress.

## Prompt

```
Screen: Workspace Home (dashboard) for Syntra, using the full authenticated app shell (248px sidebar with workspace switcher "Acme Product", nav items Home (active), Projects, My tasks, AI Chat, Reports; pinned projects "Mobile App", "Marketing Site"; bottom: Members, API keys, Settings, user avatar "Maya Chen").

Top bar: breadcrumb "Home", search field with ⌘K hint, primary button "New task", bell icon with a red dot.

Content (max width 1200px):
1. Greeting row: H1 "Good morning, Maya" and muted "Here's what needs your attention today." On the right, a secondary button "New project".
2. Four stat cards in a row: "Assigned to me 12", "Due this week 5", "In review 3", "Overdue 2" (overdue number in danger color). Each has a tiny sparkline or delta text in muted.
3. Two-column area (8/4 grid):
   Left column:
   - Card "My tasks" with tabs "Today", "Upcoming", "Overdue"; a 5-row list: status icon, task title, project pill, priority icon, due date, assignee avatar. Rows like "Design onboarding flow — Mobile App — High — Tomorrow".
   - Card "Active projects": 3 project rows each with a colored dot, name, a progress bar with "14 / 32 tasks", member avatar stack, status pill "On track" (success) / "At risk" (warning).
   Right column:
   - AI card with violet sparkle header "AI summary" and a short generated paragraph: "3 tasks are blocked in Mobile App. The onboarding flow is the main risk for Friday's release." Buttons "Ask AI" (violet outline) and "Generate weekly report" (secondary). Muted label "Generated 10 min ago".
   - Card "Recent activity": 6 entries with avatar, text like "Jonas moved Fix Safari login bug to In Review", relative time.
4. Footer help line muted.

Also render: a loading frame using skeleton blocks for every card; an empty frame for a brand-new workspace with one large empty card "Create your first project" and a secondary "Invite teammates" button. Light theme plus one dark frame.
```
