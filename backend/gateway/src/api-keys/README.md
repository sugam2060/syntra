# API keys module

Workspace-scoped API keys for the public API. A key is a Bearer token (`sk_...`) that acts for the user who created it, limited to the permissions chosen at creation and to one workspace. Routes live under the global prefix (`API_PREFIX`, default `api/v1`).

## Endpoints

Controller `workspaces/:workspaceId/api-keys`. Needs a signed-in user (Bearer JWT) holding `ai:manage_keys` in the workspace. The controller carries `@NoApiKey()`, so an API key can never create, list or revoke keys (`403`).

| Method and path | Result |
|---|---|
| `POST workspaces/:workspaceId/api-keys` | `201` the key summary plus `key` (plaintext, shown exactly once). Strict throttle |
| `GET workspaces/:workspaceId/api-keys` | `200` array of key summaries, newest first. Never contains the key |
| `DELETE workspaces/:workspaceId/api-keys/:keyId` | `204`. Idempotent: revoking a revoked key succeeds. `404` when the key is not in the workspace, `400` when `keyId` is not a UUID |

Create body (`CreateApiKeyDto`):

| Field | Rule |
|---|---|
| `name` | string, trimmed, 1 to 100 characters |
| `permissions` | non-empty array of unique permission codes (see `src/authorization`), e.g. `["ai:use"]` |
| `expiresAt` | optional ISO 8601 date, must be in the future |

Create errors: `400` validation or `expiresAt` not in the future; `403` when the creator asks for a permission they do not hold themselves (no privilege escalation); `409` when the workspace already has 20 active keys (`MAX_ACTIVE_KEYS_PER_WORKSPACE`; revoked and expired keys do not count).

Summary fields: `id`, `name`, `keyPrefix`, `permissions`, `createdBy`, `createdAt`, `expiresAt`, `revokedAt`, `lastUsedAt`.

```http
POST /api/v1/workspaces/<workspaceId>/api-keys
Authorization: Bearer <access token>
Content-Type: application/json

{ "name": "CI bot", "permissions": ["ai:use"], "expiresAt": "2027-01-01T00:00:00Z" }
```

Using the key:

```http
GET /api/v1/workspaces/<workspaceId>/<route>
Authorization: Bearer sk_<random>
```

## Key format and storage

- `sk_` followed by 32 random bytes in base64url.
- `keyPrefix` is the first 11 characters (`sk_` plus 8), kept for display.
- Only the SHA-256 hex of the key is stored (`key_hash`, unique). The plaintext cannot be recovered; a lost key must be revoked and replaced.

## Authentication flow

Global guard order (`src/app.module.ts`): `ThrottlerGuard`, `ApiKeyGuard`, `JwtAuthGuard`, `PermissionGuard`.

1. `ApiKeyGuard` looks at `Authorization: Bearer <token>`. A token that does not start with `sk_` is left to `JwtAuthGuard`. A token that starts with `sk_` is never parsed as a JWT.
2. Routes marked `@Public()` ignore the header.
3. Routes marked `@NoApiKey()` answer `403 API keys cannot be used for this endpoint`, without a database lookup.
4. Otherwise `ApiKeysService.authenticate` looks the key up through the SQL function `app.auth_find_api_key`. An unknown, revoked or expired key, or a key whose creator is inactive, gets the same `401 Invalid API key`.
5. On success `request.user` is `{ userId: <creator>, email, emailVerified, apiKey: { id, workspaceId, permissions } }`. `JwtAuthGuard` lets requests that already carry `apiKey` through.
6. `PermissionGuard` (see `src/authorization/README.md`) then requires, in addition to the creator's live rights:
   - the key's workspace equals the route's `:workspaceId`;
   - every permission of `@RequiredPermission(...)` is in the key's stored permissions.

   Any failure is the same `403` as for a user without permission. The creator must also still hold the permission now, so removing the creator's rights or deactivating the creator disables the key on the next call.

`app.auth_find_api_key` also sets `last_used_at`, at most once every 5 minutes per key, so `lastUsedAt` is approximate.

## Data model

Table `api_keys` (`src/database/schemas/workspace/api-keys.ts`, migration `drizzle/0002_solid_wendell_rand.sql`).

| Column | Notes |
|---|---|
| `id` | uuid v7 primary key |
| `workspace_id` | FK `workspaces`, cascade delete |
| `created_by` | FK `users`, cascade delete. The user the key acts for |
| `name`, `key_prefix`, `key_hash` | `key_hash` is unique |
| `permissions` | `text[]`, default empty. Unknown codes are dropped when read |
| `expires_at`, `revoked_at`, `last_used_at` | nullable timestamptz |
| `created_at` | timestamptz |

Row level security (role `app_user`): select, insert and update require `app.has_permission(workspace_id, 'ai:manage_keys')`; insert also requires `created_by` to be the current user. There is no delete policy for users: revoking sets `revoked_at`. Rows are removed only by the maintenance purge (revoked or expired more than 90 days ago, see `src/jobs/maintenance/README.md`).

Key management runs in `DatabaseService.withTenant`. Authentication-time lookup uses the `SECURITY DEFINER` function because no user context exists yet.

## Public interface

`index.ts` exports `ApiKeysModule`, `ApiKeysService`, `ApiKeyGuard` and the types (`ApiKeySummary`, `CreatedApiKey`, `ApiKeyLookup`, `RevokeResult`).

## Gotchas

- The permission check is opt-in. A key can call any route that is neither `@Public()` nor `@NoApiKey()`, and a route without `@RequiredPermission` is not checked against the key's workspace or permissions. New routes that must not be reachable with a key (anything managing identity or credentials) need `@NoApiKey()`.
- The 20-key limit is checked in a separate transaction before the insert, so concurrent creates can exceed it slightly.
- `expires_at` is checked in the application (`authenticate`), not in SQL.

## Tests

- Unit: `src/api-keys/test/` (guard, key util, service), `src/common/test/permission.guard.spec.ts` (`npm test`).
- HTTP: `test/api-keys/api-keys.e2e-spec.ts` (`npm run test:e2e`; needs the containers up and `npm run db:migrate` applied).
- Manual: folder 7 of `test/postman/authentication.json` (needs a `workspaceId`).
