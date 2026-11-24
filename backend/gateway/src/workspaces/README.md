# Workspaces module

Tenant management for the gateway: workspaces, members, roles, per-member permission overrides and email invitations. Everything else (projects, tasks, AI) hangs off a workspace id.

All routes sit under the global prefix `/api/v1`. Access is enforced twice: by `PermissionGuard` (`@RequiredPermission`) and by row level security in the database. The service layer adds the rules RLS cannot express (see "Rules" below).

## Endpoints

### Workspaces (`workspaces`)

| Route | Needs | Notes |
|---|---|---|
| `POST /workspaces` | signed-in user | Strict throttle. Body `{ name, slug }`. Caller becomes owner (`app.create_workspace`). `400` reserved slug, `409` slug taken |
| `GET /workspaces` | signed-in user | Workspaces the caller belongs to, each with the caller's `role` |
| `GET /workspaces/slug-availability?slug=` | signed-in user | Strict throttle. `{ slug, available, reason: null \| invalid \| reserved \| taken }`. Never `400` for a bad slug |
| `GET /workspaces/by-slug/:slug` | member | Resolves `/w/:slug` to the workspace id. `404` for a non-member, same as a missing slug |
| `GET /workspaces/:workspaceId` | `workspace:read` | API keys allowed |
| `PATCH /workspaces/:workspaceId` | `workspace:update` | Body `{ name?, slug? }`, at least one |
| `DELETE /workspaces/:workspaceId` | `workspace:delete` | `204`. Owner only by default |

### Members (`workspaces/:workspaceId/members`)

| Route | Needs | Notes |
|---|---|---|
| `GET` | `workspace:read` | Name, email, avatar, role, `isOwner`, `joinedAt`. API keys allowed |
| `PATCH :userId` | `member:update_role` | Body `{ roleId }` |
| `DELETE :userId` | `member:remove` | `204` |
| `DELETE me` | `workspace:read` | Leave the workspace. `403` for the owner |
| `GET :userId/permission-overrides` | `member:update_role` | |
| `PUT :userId/permission-overrides` | `member:update_role` | Body `{ overrides: [{ permissionKey, effect: allow \| deny }] }`. Replaces the whole set; `[]` clears it |
| `DELETE :userId/permission-overrides/:permissionKey` | `member:update_role` | `204`, `404` when there was none |

### Roles (`workspaces/:workspaceId`)

| Route | Needs | Notes |
|---|---|---|
| `GET roles` | `workspace:read` | Built-in roles plus this workspace's custom roles, each with its permission keys |
| `GET permissions` | `workspace:read` | The permission catalogue |
| `POST roles` | `member:update_role` | Body `{ name, permissions[] }`. The key is derived from the name (`Release Manager` -> `release-manager`) |
| `PATCH roles/:roleId` | `member:update_role` | Body `{ name?, permissions? }`. The key never changes |
| `DELETE roles/:roleId` | `member:update_role` | `409` while a member or invitation uses the role |

### Invitations, managing (`workspaces/:workspaceId/invitations`, needs `member:invite`, never API keys)

| Route | Notes |
|---|---|
| `POST` | Body `{ emails[1..20], roleId, message? }`. Answers one result per address: `invited`, `already_member` or `already_invited` |
| `GET` | Open invitations; expired ones are included with `status: expired` |
| `POST :invitationId/resend` | New token and expiry; the earlier link stops working |
| `DELETE :invitationId` | Revoke. `204`, then `404` |

### Invitations, invitee side (`invitations`, never API keys)

| Route | Notes |
|---|---|
| `GET invitations/mine` | Live invitations for the caller's **verified** email, with workspace name and slug |
| `GET invitations/preview?token=` | Public, strict throttle. Workspace name, role, inviter, invited email, status. No ids |
| `POST invitations/accept` | Body `{ token }` (emailed link) **or** `{ invitationId }` (in-app list). Returns `{ workspaceId }` |
| `POST invitations/:invitationId/decline` | `204` |

The email link is `${FRONTEND_URL}/invitations/accept?token=...`.

## Rules

- **No privilege escalation.** Nobody can assign a role, create or edit a role, grant an `allow` override or invite into a role containing a permission they do not hold themselves (`PermissionService.hasAll`). Denying is always allowed, but lifting a `deny` (removing it, or turning it into an `allow`) counts as granting that permission, so the caller must hold it. Nobody can change their own role or permission overrides, so a restriction set by someone else cannot be cleared by its target.
- **The owner is fixed.** The owner role is never assigned or offered in an invitation; the owner cannot be demoted, removed, given overrides or leave. Ownership transfer does not exist yet.
- **Built-in roles are read-only**; custom roles cannot reuse a built-in key (`owner`, `admin`, `member`, `viewer`).
- **Tokens.** The invitation token is 32 random bytes (base64url). Only its SHA-256 is stored (`workspace_invitations.token_hash`); the raw value exists only in the email. A link lasts `INVITATION_TTL_DAYS` (default 7).
- **Accepting is decided in SQL.** `app.accept_workspace_invitation` needs a verified email equal (case-insensitive) to the invited address, and a single `UPDATE` makes it single-use even under concurrent requests. Everything that fails answers one generic `400 Invalid or expired invitation`; an unverified email answers `403` with `error: EMAIL_NOT_VERIFIED`, the same code sign-in uses.
- **One open invitation per address per workspace** (partial unique index). An expired invitation still holds that slot, so inviting the address again revokes the expired one and issues a new one.
- **Email failures never fail a request.** A queueing error is logged and the invitation exists; use resend.
- **API keys** may only call the read routes marked above. Everything that creates, changes or deletes is `@NoApiKey()`.

## Data and SQL

No new tables: the schema in `src/database/schemas/workspace/` already covers everything. New SECURITY DEFINER functions in `script/sql/02-security-functions.sql` (applied by `npm run db:migrate`), needed because RLS hides workspaces from non-members and blocks invitees from writing their own member row:

| Function | Purpose |
|---|---|
| `app.workspace_slug_available(slug)` | Slug check across all workspaces (signed-in callers only) |
| `app.preview_workspace_invitation(token_hash)` | Public preview of an emailed token |
| `app.list_my_workspace_invitations()` | Live invitations for the caller's verified email |
| `app.accept_workspace_invitation(token_hash, invitation_id)` | Accept by token **or** id; raises `P0002 invitation_invalid` or `42501 email_not_verified` |
| `app.decline_workspace_invitation(invitation_id)` | Decline an invitation addressed to the caller |
| `app.purge_workspace_invitations()` | Delete invitations finished more than 30 days ago (run by the maintenance job) |

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `INVITATION_TTL_DAYS` | `7` | Lifetime of an invitation link (`src/config/workspace.config.ts`) |
| `FRONTEND_URL` | `http://localhost:3001` | Base of the accept link |

## Files

| File | Role |
|---|---|
| `workspaces.module.ts` | Wires the five controllers and services; imports `AuthorizationModule`, `EmailModule` |
| `*.controller.ts` | Thin HTTP layer: `workspaces`, `members`, `roles`, `invitations` (managing), `my-invitations` (invitee) |
| `*.service.ts` | Business rules and error mapping |
| `*.repository.ts` | All SQL. Tenant queries run in `withTenant`; invitee and slug flows call the SQL functions |
| `dto/` | class-validator request DTOs |
| `types/` | Response and internal types, one concept per file |
| `utils/slug.util.ts`, `utils/role-key.util.ts` | Slug rules and reserved words; role key derivation |

Shared helpers outside the module: `src/common/utils/opaque-token.util.ts` (token generation and hashing, also used by `TokenService`) and the `buildWorkspaceInvitationEmail` template in `src/jobs/email`.

## Tests

- Unit: `src/workspaces/test/` (services, slug and role-key utils), `src/jobs/email/test/email-templates.spec.ts`, `src/common/test/opaque-token.util.spec.ts`. `npm test`.
- Integration and HTTP: `test/workspaces/` (`npm run test:e2e`; needs the containers up and `npm run db:migrate` applied). `workspace-functions` tests the SQL functions as `app_user`; `workspaces`, `members`, `roles` and `invitations` run the real app against the real database with the email producer stubbed (`helpers/workspaces-e2e.ts`).
