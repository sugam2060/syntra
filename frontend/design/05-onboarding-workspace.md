# 05 — Onboarding: create or join a workspace

Route `/onboarding` (also reached after Google sign-in via `/auth/callback`) · Backend 🕓 workspace create endpoint not built yet (DB function `app.create_workspace()` and invitations schema exist) · ✅ `GET authentication/me`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- `/auth/callback` is a transient screen: it calls `POST refresh` to get an access token, then routes to Home or Onboarding. It shows a loading card; `?error=oauth_failed` sends the user back to sign in with a banner; `?linked=google` goes to Account.
- Workspace has `name` and a unique `slug` (shown as `syntra.app/w/<slug>`, auto-generated from the name, editable, availability checked).
- A user with a pending invitation (matched by verified email) sees it first: "You've been invited to Acme Product".
- Creator becomes the workspace Owner. Roles available later: Admin, Member, Viewer.

## Prompt

```
Screen set: Onboarding for Syntra, four frames, centered layout with a slim top bar (logo left, user avatar menu right with "Sign out") and a 3-step progress indicator.

Frame A — Auth callback transition: centered card with skeleton ring, "Signing you in…" and a muted line "Securing your session".

Frame B — Choose how to start (step 1 of 3): H1 "Welcome to Syntra, Maya", muted "Set up a workspace for your team." Two large selectable cards side by side (each 280px, border, hover raise):
 - "Create a workspace" with a plus-in-square icon, text "Start fresh and invite your team."  (primary outline when selected)
 - "Join with an invitation" with an envelope icon, text "Use the invite sent to maya@acme.com."
Below, if there is a pending invitation, a highlighted row card: workspace avatar "AP", "Acme Product invited you as Member", buttons "Accept" (primary) and "Decline" (ghost). Primary button "Continue".

Frame C — Create workspace (step 2 of 3): H1 "Name your workspace", field "Workspace name" (placeholder "Acme Product"), field "Workspace URL" with a fixed prefix "syntra.app/w/" and an editable slug "acme-product" plus a green check "Available" (variant: red "Already taken"). Optional "Team size" segmented control (Just me, 2–5, 6–15). Buttons "Back" (ghost) and "Create workspace" (primary).

Frame D — Invite teammates (step 3 of 3): H1 "Invite your team", multi-email chip input "Add emails separated by commas", a role select defaulting to "Member" (options Admin, Member, Viewer with one-line descriptions), a list of added chips with remove icons, buttons "Skip for now" (ghost) and "Send invites" (primary). Right side a small preview card of how a project board looks, muted.

Light theme; one dark frame of Frame B.
```
