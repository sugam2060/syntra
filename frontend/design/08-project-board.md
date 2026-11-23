# 08 — Project board (Kanban)

Route `/w/:workspace/projects/:id` (Board tab) · Backend 🕓 (tasks not built yet) · permissions `task:read|create|update|assign`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Columns are the fixed statuses: Backlog → Todo → In Progress → In Review → Done. Drag and drop between columns (dnd-kit) changes status; drag within a column reorders.
- Filters: Assignee, Status, Priority, Labels, Due date. Saved as chips under the toolbar.
- Task card fields: title, labels, priority, assignee, due date, comment count, AI badge when the task has AI-generated subtasks.
- Viewers see the board read-only (no drag, no "+ Add task").

## Prompt

```
Screen: Project board (Kanban) for Syntra, full authenticated app shell, board uses the full content width with horizontal scroll.

Header row: breadcrumb "Projects / Mobile App", project title H1 with emoji icon and a star toggle, member avatar stack with an "Invite" ghost button, tab bar "Board" (active), "List", "AI Chat", "Reports" with underline indicator in primary. Right side: primary button "New task", secondary violet-outline button "✦ Ask AI".

Toolbar: search "Filter tasks", filter chips "Assignee ▾", "Priority ▾", "Labels ▾", "Due date ▾", ghost button "Clear filters", and a view options button (group by, show fields).

Board: five columns, 300px wide, 12px gap, each with header: status dot + name + count badge and a "+" icon button. Columns: Backlog (6), Todo (5), In Progress (4), In Review (3), Done (9).

Task cards (surface, 1px border, 10px radius, 12px padding):
- Top: short id in mono "MOB-142" muted; priority icon (Urgent red double-arrow-up, High amber up arrow, Medium blue equals, Low grey down).
- Title (14px medium, max 2 lines), e.g. "Design onboarding flow", "Fix Safari login bug", "Set up CI pipeline", "Write release notes", "Add push notification settings".
- Label pills (e.g. "design", "bug", "infra") in tinted colors.
- Footer row: due date with calendar icon (red when overdue), comment count with bubble icon, a small violet sparkle chip "4 subtasks" on tasks with AI breakdown, and an assignee avatar on the right.

States to show in the same frame:
- One card being dragged (slightly rotated, raised shadow, 90% opacity) with a dashed indigo drop placeholder in the target column.
- A column header hover showing the "+ Add task" inline composer (a card with an input "Task title…" and Enter hint).
- A "Done" column collapsed to a thin vertical rail.

Extra frames: loading skeleton columns; empty board with a centered message "No tasks yet" and two buttons "Create task" and "✦ Generate tasks with AI"; read-only viewer variant; an inline error banner "Couldn't move the task. Retry" with a retry action; mobile frame (390px) showing a single column with a horizontal status tab strip.
Light theme plus one dark frame of the main board.
```
