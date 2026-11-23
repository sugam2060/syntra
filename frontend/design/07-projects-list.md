# 07 — Projects list

Route `/w/:workspace/projects` · Backend 🕓 (project CRUD not built yet) · permissions `project:read`, `project:create`, `project:update`, `project:delete`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Project fields: name, description, status, created/updated timestamps.
- Grid and table toggle. Create dialog needs `project:create`; delete needs `project:delete` and a typed confirmation.
- Project status values: Active, On hold, Completed, Archived.

## Prompt

```
Screen: Projects list for Syntra inside the standard authenticated app shell ("Projects" active in the sidebar).

Page header: H1 "Projects", muted "12 projects in Acme Product". Right: segmented toggle (Grid | Table), secondary button "Filter", primary button "New project".

Toolbar below: search input "Search projects", filter chips "Status: Active ▾", "Owner ▾", sort select "Last updated ▾".

Frame A — Grid view: 3-column grid of project cards (surface, 1px border, 10px radius). Each card: colored square icon with emoji, project name (H3), 2-line muted description, progress bar with "14 / 32 tasks", status pill (Active green, On hold amber, Completed grey), member avatar stack (max 4 and "+2"), updated "2 days ago", and a three-dot menu (Open, Edit, Archive, Delete in danger color). Show 6 cards with believable names: "Mobile App", "Marketing Site", "Design System", "Billing Revamp", "Customer Portal", "Internal Tools".

Frame B — Table view: columns Name (with icon), Status, Progress (bar + count), Lead (avatar + name), Members, Updated; sticky header, 40px rows, row hover state and a row checkbox column.

Frame C — "New project" dialog (480px, raised surface): fields "Project name", "Description" (textarea, optional), "Icon and color" picker row, "Status" select defaulting to Active, a violet-outlined toggle "Let AI suggest an initial task list" with sparkle icon and helper "Generates 4–8 starter tasks from your description.", buttons "Cancel" and "Create project".

Frame D — Delete confirmation dialog: danger icon, "Delete Mobile App?", body "This removes 32 tasks and all comments. This can't be undone.", input "Type the project name to confirm", destructive button disabled until it matches.

Frame E — Empty state: centered icon, "No projects yet", "Create a project to start planning with your team.", primary "New project".
Frame F — Viewer role: same grid but "New project" button and menu actions hidden. Loading frame with skeleton cards. Light theme plus one dark frame of Frame A.
```
