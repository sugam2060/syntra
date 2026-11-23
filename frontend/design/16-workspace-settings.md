# 16 — Workspace settings

Route `/w/:workspace/settings` · Backend 🕓 (schema ✅: `workspaces` has `name`, `slug`, `owner_id`; RLS requires `workspace:update` to edit and `workspace:delete` to delete) · permissions `workspace:read|update|delete`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- General: name, slug (unique, changing it changes URLs), optional logo.
- Danger zone: delete workspace (Owner only, because `workspace:delete` is not granted to Admin) with typed confirmation. Transfer ownership is a later feature; show it disabled.
- Settings sub-navigation is shared with API keys and Members.

## Prompt

```
Screen set: Workspace settings for Syntra inside the standard app shell ("Settings" active) with the settings sub-navigation (General (active), Members, API keys, Billing greyed "Soon"), content column max 720px.

Frame A — General settings:
1. H1 "Workspace settings", muted "Manage Acme Product".
2. Card "Workspace profile": logo uploader (64px rounded square "AP" with "Upload" and "Remove" ghost buttons), field "Workspace name", field "Workspace URL" with fixed prefix "syntra.app/w/" and slug, helper "Changing the URL breaks existing links." Footer inside the card with "Save changes" (primary, disabled until edited) and "Cancel".
3. Card "Defaults": select "Default role for new members" (Member), select "Default task view" (Board or List), toggle "Enable AI features for all members" with the violet sparkle and helper "Members without the ai:use permission can't use AI."
4. Card "Danger zone" with a danger-tinted 1px border: row "Transfer ownership" with a disabled secondary button and "Coming soon"; row "Delete workspace" with muted "Permanently deletes all projects, tasks and API keys." and a destructive button "Delete workspace".

Frame B — Delete workspace dialog: danger icon, "Delete Acme Product?", bullet list of what will be removed (12 projects, 184 tasks, 3 API keys, 7 members lose access), input "Type acme-product to confirm", destructive button disabled until it matches.

Frame C — Slug taken inline error "That URL is already in use." and an unsaved-changes bar at the bottom "You have unsaved changes" with Discard / Save.
Frame D — Admin view: Danger zone hidden because the user lacks workspace:delete. Frame E — Viewer view: inputs read-only with a muted note "Only admins can change workspace settings." Frame F — mobile (390px).
Light theme plus one dark frame of Frame A.
```
