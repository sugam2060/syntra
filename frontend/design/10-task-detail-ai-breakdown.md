# 10 — Task detail and AI task breakdown

Route `/w/:workspace/projects/:id/tasks/:taskId` (side drawer over the board, also full page on direct load) · Backend 🕓 · permissions `task:read|update|assign`, `comment:create`, `ai:use`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Task fields: title, rich-text description, status, priority, assignee, labels (multi-select), due date, created by / updated by, comment count.
- Threaded comments and an activity feed (created, status changed, assignee changed).
- AI Task Breakdown (core differentiator): "Break down with AI" generates **4–8 subtasks** with a title and short description. The user can accept all, edit individual items, remove items, or regenerate. Fast operation, so it is a synchronous call with a short loading state.
- Smart suggestions (P1): while creating/editing, AI suggests priority, labels and assignee with one-click apply.

## Prompt

```
Screen set: Task detail for Syntra, shown as a right-side drawer (640px wide) over the dimmed Kanban board, plus the AI breakdown flow.

Frame A — Task detail drawer:
- Header: mono id "MOB-142", breadcrumb "Mobile App", copy-link icon, expand-to-full-page icon, close icon.
- Title as large editable text: "Design onboarding flow".
- Property rows in a two-column list: Status (pill "In Progress", clickable), Priority (High, amber icon), Assignee (avatar Maya Chen), Labels ("design", "mobile" pills plus "+"), Due date (Fri, Dec 5), Created by (Jonas Weber, 3 days ago).
- Description: rich-text editor area with a slim toolbar (bold, italic, list, link, code) and a paragraph of realistic text.
- A highlighted violet-tinted card "✦ Break down with AI" with the helper "Split this task into 4–8 actionable subtasks." and a violet filled button "Break down".
- Subtasks section header "Subtasks 0/3" with checkbox rows.
- Tabs "Comments (4)" and "Activity"; comment thread with avatars, timestamps, one threaded reply indented, and a composer "Write a comment…" with a send button.
- Suggestion strip near the property rows: violet sparkle chip "AI suggests: Priority High · label ‘onboarding’ · Assignee Jonas" with "Apply" and "Dismiss".

Frame B — AI breakdown loading: the AI card shows shimmer skeleton rows and "Thinking through the steps…" with a subtle animated sparkle; the Break down button is disabled.

Frame C — AI breakdown result (draft): a violet-bordered panel titled "✦ AI suggested subtasks (6)" with a "Draft" badge. Six rows, each with a drag handle, an editable title and a muted one-line description, e.g. "Audit current signup funnel", "Draft three onboarding screen concepts", "Review concepts with the team", "Build high-fidelity prototype", "Run usability test with 5 users", "Hand off specs to engineering". Each row has an edit pencil and a remove ✕. Footer actions: primary "Accept all (6)", secondary "Edit selected", ghost "Regenerate" with a refresh icon, and a muted line "You can edit everything after accepting."

Frame D — Row in edit mode: title input and description textarea inline with Save / Cancel.

Frame E — Accepted: subtasks appear in the Subtasks list with a violet sparkle marker, plus a success toast "6 subtasks added".

Frame F — Error: the panel shows a danger banner "AI couldn't generate subtasks. Try again." with a "Retry" button. Frame G — Viewer / no `ai:use`: the AI card is hidden, properties are read-only (no hover affordances). Frame H — mobile (390px) full-screen sheet version.
Light theme plus one dark frame of Frame C.
```
