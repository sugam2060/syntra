# 11 — AI project chat

Route `/w/:workspace/projects/:id/chat` (full page) and a collapsible right-side panel on Board/List · Backend 🕓 (HTTP real-time to the AI service) · permission `ai:use`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Persistent chat scoped to a single project. The AI knows every task, status, assignee, recent comments and the project description.
- Example prompts: "What are the biggest risks right now?", "Summarize progress for this week", "Who should take the next high-priority task?", "What's currently blocked?".
- Answers cite the tasks they used (clickable task chips). Streaming is a post-MVP idea; design a typing indicator now and leave room for token streaming.
- Users without `ai:use` see a locked state.

## Prompt

```
Screen set: AI Project Chat for Syntra.

Frame A — Full page chat inside the project tab bar ("AI Chat" active), standard app shell. Layout: conversation column centered at 720px max width; right context sidebar 300px.
- Chat header: violet sparkle icon, "Mobile App assistant", muted "Has access to 32 tasks, 4 members and recent comments", a ghost "New chat" button and a history dropdown.
- Messages: user bubbles right-aligned (primary tint background); assistant messages left-aligned, no bubble, with a small violet avatar. Sample conversation:
  User: "What are the biggest risks right now?"
  Assistant: a short intro line, then a numbered list of 3 risks in readable markdown (bold lead-in each), followed by a row of source chips that look like task links: "MOB-142 Design onboarding flow", "MOB-131 Fix Safari login bug", "MOB-127 Push notification settings".
  Under the answer a toolbar: copy, thumbs up, thumbs down, regenerate.
  User: "Who should take the next high-priority task?"
  Assistant: a suggestion card inside the message: avatar Jonas, "Jonas Weber — 2 open tasks, finished 5 similar tasks", with a button "Assign MOB-148 to Jonas" (primary, small).
- A typing indicator state (three dots in a muted bubble).
- Composer pinned at the bottom: rounded 10px multi-line input "Ask about this project…", an attach-context "@" button for mentioning a task, a send icon button; helper "AI can make mistakes. Check important details."
- Empty state above the composer: heading "Ask anything about Mobile App" and 4 suggested prompt cards in a 2x2 grid (each with a small icon): "What are the biggest risks?", "Summarize this week", "What's blocked?", "Who should take the next task?".
- Right sidebar "Context": mini stats (Open 14, Blocked 3, Due this week 5), "Referenced tasks" list, a muted "Data refreshed 2 min ago".

Frame B — Side panel mode: the Kanban board on the left and a 380px collapsible chat panel on the right with the same messages and a compact composer.

Frame C — Error: assistant message replaced by a danger inline card "Couldn't reach the AI service" with "Retry". Frame D — Locked: no `ai:use`, a centered card with a lock icon "Ask an admin to enable AI for your role." Frame E — Mobile (390px) with a bottom-sheet composer.
Light theme plus one dark frame of Frame A.
```
