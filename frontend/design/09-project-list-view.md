# 09 — Project list view

Route `/w/:workspace/projects/:id?view=list` (List tab) · Backend 🕓 · permissions `task:read|update|assign`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Same data and filters as the board, shown as a sortable, groupable table. Inline edit of status, priority, assignee and due date through popovers.
- Bulk actions appear when rows are selected (change status, assign, delete). Delete needs `task:delete`.

## Prompt

```
Screen: Project List view for Syntra, same header, tab bar ("List" active) and toolbar as the Board screen, inside the standard app shell.

Main area: a dense, sortable table grouped by status with collapsible group headers (status dot, name, count, "+" to add). Columns: checkbox, ID (mono, muted), Title (with label pills after the title), Status (pill with colored dot), Priority (icon + label), Assignee (avatar + name), Due date (red when overdue), Updated (relative), and a hover-only three-dot menu. 40px rows, sticky header with sort arrows on Title, Priority, Due date, Updated. Include around 12 rows across the groups "In Progress", "In Review", "Todo" using realistic titles.

Show these in the same frame:
- Two rows selected with a floating bulk-action bar at the bottom center: "2 selected" · "Change status ▾" · "Assign ▾" · "Delete" (danger) · "✕".
- A status popover open from one row listing the five statuses with dots and a check next to the current one.
- An assignee popover with a search input and a list of five members with avatars.
- An inline "Add task" row at the bottom of one group with an input and "Enter to create".

Additional frames: empty filtered state ("No tasks match these filters" with "Clear filters"), loading skeleton rows, and a mobile frame (390px) that turns each row into a two-line card with status icon, title, due date and assignee avatar.
Light theme plus one dark frame.
```
