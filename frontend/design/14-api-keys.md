# 14 — API keys

Route `/w/:workspace/settings/api-keys` · Backend ✅ `POST|GET /api/v1/workspaces/:workspaceId/api-keys`, `DELETE …/api-keys/:keyId` · permission `ai:manage_keys` (signed-in user only; keys cannot manage keys)

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes (from the gateway)

- Key format `sk_` + 43 base64url characters. The plaintext key is returned **once** at creation; afterwards only the prefix (`sk_` + 8 chars) is shown.
- Create body: `name` (1–100 chars), `permissions` (non-empty, unique codes; you can only grant permissions you hold yourself, else 403), optional `expiresAt` (future date). Max **20 active keys** per workspace (409 above that). Strict throttle applies.
- List fields: name, key prefix, permissions, creator, created, expires, revoked, last used (approximate, updated at most every 5 minutes).
- Revoke is idempotent (204), takes effect on the next request.
- A key acts for its creator and is limited to one workspace; effective rights are the intersection of the key's permissions and the creator's live permissions.
- Usage: `Authorization: Bearer sk_…`.

## Prompt

```
Screen set: API keys management for Syntra, under Workspace settings. Standard app shell with a settings sub-navigation on the left of the content (General, Members, API keys (active), Billing greyed "Soon").

Header: H1 "API keys", muted "Let other tools use Syntra's AI agents. Keys act on your behalf and are limited to this workspace.", primary button "Create API key", secondary ghost link "View API docs ↗". Info banner under the header (info tint, key icon): "Treat keys like passwords. You can only see a key once."

Frame A — Keys table: columns Name (e.g. "CI bot", "Zapier integration", "Staging tests"), Key (mono, prefix like "sk_aB3dE9xK…" with a copy icon that copies only the prefix), Permissions (up to 2 permission chips in mono such as "ai:use" and "+1"), Created by (avatar + name), Created, Expires (with relative text; "Never" in muted; amber "Expires in 6 days"), Last used ("2 hours ago" or "Never used"), Status pill (Active green, Expired amber, Revoked grey), and a three-dot menu with "Revoke key" in danger. Revoked rows are dimmed. A counter in the table header "4 of 20 active keys" with a thin progress bar.

Frame B — Create key dialog (520px): field "Name" (counter 0/100), "Permissions" as a checklist grouped by area where only permissions the user holds are enabled (others disabled with a tooltip "You don't have this permission"): ai:use checked by default, project:read, task:read, task:create, comment:create etc. shown with mono codes and short descriptions; "Expiration" select (30 days, 90 days, 1 year, Custom date, No expiration with a warning hint); buttons "Cancel" and "Create key". Error variants: 403 inline "You can't grant permissions you don't have."; 409 banner "This workspace already has 20 active keys. Revoke one to create another."

Frame C — Key created (one-time reveal) dialog: green check, "Copy your key now", a mono, selectable full key row "sk_aB3dE9xK2mQ7…" with a prominent "Copy" button that turns into "Copied ✓", a warning callout "You won't be able to see this key again.", a code sample block with the curl usage:
curl -H "Authorization: Bearer sk_…" https://api.syntra.app/api/v1/workspaces/<workspaceId>/…
and a primary "Done" button that requires ticking "I've stored this key safely".

Frame D — Revoke confirmation: "Revoke CI bot?" with consequence text "Requests using this key will fail immediately." and a destructive button "Revoke key".
Frame E — Empty state: key icon, "No API keys yet", "Create a key to call the AI agents from your own tools.", primary "Create API key".
Frame F — No permission: page shows a lock card "You need the ai:manage_keys permission". Frame G — loading skeleton rows. Frame H — mobile (390px) cards.
Light theme plus one dark frame of Frame A.
```
