# Changelog

All notable changes to the gateway. Format: Added / Changed / Fixed / Removed under `## [Unreleased]`.

## [Unreleased]

### Added

- Authentication module (`src/authentication`) under global prefix `/api/v1` (`API_PREFIX`): register, login, refresh, logout, logout-all, me, Google OAuth (`google`, `callback/google`), verify-email, resend-verification, forgot-password, reset-password.
- Access tokens: 15-minute HS256 JWT in the response body. Refresh tokens: opaque, SHA-256 stored in `sessions`, rotated on each use with reuse detection, delivered as an httpOnly `SameSite=Lax` cookie scoped to `/api/v1/authentication`.
- Google OAuth via passport with a stateless `state` cookie. Linking to an unverified local account deletes its password and revokes its sessions.
- Global `JwtAuthGuard` (opt out with `@Public()`), `ThrottlerGuard` with a `default` throttler on every route and a strict `auth` throttler that applies only where `@StrictThrottle()` is present, `AllExceptionsFilter`, `ValidationPipe`, helmet, cookie-parser and CORS from `FRONTEND_URL` (`src/app.setup.ts`, `src/common`).
- SECURITY DEFINER SQL functions in `script/sql/02-security-functions.sql`: `app.auth_find_user_by_email`, `app.auth_find_oauth_account`, `app.auth_create_user`, `app.auth_rotate_session`, `app.auth_revoke_session`, `app.auth_create_reset_token`, `app.auth_consume_token`, `app.auth_create_oauth_user`.
- BullMQ `email` queue (`src/jobs`) with nodemailer SMTP worker; Mailpit service in `docker-compose.yml` (SMTP 1025, UI 8025).
- Typed config providers (`app`, `auth`, `mail`, `redis`) with env validation.
- Env keys: `PORT`, `API_PREFIX`, `FRONTEND_URL`, `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`, `AUTH_THROTTLE_LIMIT`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `REFRESH_TOKEN_TTL_DAYS`, `EMAIL_VERIFICATION_TTL_HOURS`, `PASSWORD_RESET_TTL_MINUTES`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`.
- Authorization module (`src/authorization`, see its `README.md`): `@RequiredPermission(Permission.X, ...)` decorator (several codes = all required, handler overrides controller), `@WorkspaceId()` parameter decorator, global `PermissionGuard` (last `APP_GUARD`, after `ThrottlerGuard`, `ApiKeyGuard` and `JwtAuthGuard`; code in `src/common/guards/permission.guard.ts`) and `PermissionService.hasAll` (one query through `app.has_permission`). The guard is opt-in: routes without the decorator are not checked. Responses: `401` without a user, `400` for a missing or non-UUID `:workspaceId`, one identical `403` for non-member, missing permission and unknown workspace.
- `Permission` constant (`src/database/schemas/workspace/permission-keys.ts`) with the 18 permission codes, plus `PermissionKey` and `PERMISSION_KEYS` derived from it. Adding a code needs one line there and one seed row in a new custom migration; `test/database/rls.e2e-spec.ts` fails if they drift.

- API keys (`src/api-keys`, see its `README.md`): `POST`, `GET` and `DELETE workspaces/:workspaceId/api-keys[/:keyId]`, all needing `ai:manage_keys` and a signed-in user. Keys are `sk_` plus 32 random bytes (base64url), stored only as SHA-256, shown in plaintext once; optional `expiresAt`; at most 20 active keys per workspace (`409`); a creator cannot grant permissions they lack (`403`). Revoking is idempotent (`204`, `404` for an unknown key).
- Table `api_keys` (`src/database/schemas/workspace/api-keys.ts`, migration `drizzle/0002_solid_wendell_rand.sql`) with row level security for `ai:manage_keys`, and SQL function `app.auth_find_api_key` (key lookup before any user context exists; refreshes `last_used_at` at most every 5 minutes).
- `ApiKeyGuard`: a request with `Authorization: Bearer sk_...` is authenticated as the key's creator, limited to the key's workspace and stored permissions (and to what the creator still holds). Invalid, revoked, expired keys and keys of inactive creators all answer `401`. `AuthenticatedUser` gains an optional `apiKey` (`id`, `workspaceId`, `permissions`).
- `@NoApiKey()` decorator (`src/common/decorators/no-api-key.decorator.ts`): routes marked with it answer `403` to API keys. Applied to the whole authentication controller and to the key-management controller.
- `POST /authentication/change-password`: sets a new password, revokes every session and returns a fresh session like `login`. An OAuth-only account can add a first password without `currentPassword`.
- `POST /authentication/google/link` (returns `{ url }`, sets the `oauth_state` and signed `oauth_link` cookies) and `DELETE /authentication/google` (`404` not linked, `409` last sign-in method). The Google callback links instead of signing in when the link intent matches and redirects to `/auth/callback?linked=google`; a Google account already linked to a user redirects with `?error=oauth_link_failed`.
- `GET /authentication/me` now also returns `hasPassword` and `providers`.
- `sessions.rotated_at` (migration `drizzle/0003_ordinary_wallow.sql`), set when a refresh replaces a session.
- BullMQ queue `maintenance` with a repeatable job `purge-expired-auth-data` (`src/jobs/maintenance`, see its `README.md`) that calls the new SQL function `app.auth_purge_expired()`: sessions expired more than 1 day ago, verification tokens expired or consumed more than 7 days ago, API keys revoked or expired more than 90 days ago. Revoked but unexpired sessions are kept.
- Env `AUTH_CLEANUP_CRON` (default `0 3 * * *`): five-field cron pattern of the purge.
- Env `TRUST_PROXY` (default `false`; `true` or a hop count such as `1`): sets Express `trust proxy` so rate limits and stored session IPs use the client address behind a load balancer (`src/config/trust-proxy.ts`, applied in `src/app.setup.ts`). An invalid value fails startup.
- `RouteAuditService` (`src/common/route-audit`): logs a warning at startup for each route with `:workspaceId` in its path that has neither `@RequiredPermission` nor `@Public()`.
- `toDate` helper (`src/common/utils/date.util.ts`) that normalises timestamps from raw `db.execute()` rows (returned as strings) to `Date`.
- Tests: unit specs next to the modules (`src/api-keys/test`, `src/jobs/maintenance/test`, `src/config/test`, `src/common/test`); integration and e2e in `test/api-keys`, `test/authentication/account-security`, `test/authentication/trust-proxy`, `test/maintenance`, `test/common`, `test/authorization`. Postman collection `test/postman/authentication.json` now has 7 folders; folder 7 (API keys) is manual and needs a `workspaceId`.

### Changed

- Refresh-token reuse detection now relies on `sessions.rotated_at`: only a token that was rotated counts as reuse and revokes all sessions of the user. A token revoked by logout, logout-all, password change or password reset is simply invalid (`401`) and revokes nothing else. `app.auth_rotate_session` sets both `revoked_at` and `rotated_at`.
- `PermissionGuard` moved from `src/authorization/guards/` to `src/common/guards/permission.guard.ts` (still exported from `src/authorization/index.ts`; `AuthorizationModule` no longer provides it). Its spec moved to `src/common/test/permission.guard.spec.ts`. It now also enforces an API key's workspace and permissions.
- Global guard order is now `ThrottlerGuard`, `ApiKeyGuard`, `JwtAuthGuard`, `PermissionGuard`. `JwtAuthGuard` lets requests already authenticated by an API key through.
- Authentication controller is marked `@NoApiKey()`: API keys get `403` on every authentication route.
- New accounts start with `is_active = false` and become active only when the email is verified (`verify-email`; also by password reset or by linking Google). `app.auth_create_user` sets `is_active` from the verified flag. Administrator-disabled accounts (inactive but verified) stay disabled.
- `POST /authentication/login` returns `403` with `error: EMAIL_NOT_VERIFIED` for a correct password on an unverified account.
- `POST /authentication/resend-verification` is now public and takes `{ email }`, because unverified accounts cannot sign in. New SQL function `app.auth_create_verification_token`; `app.auth_create_reset_token` now also serves unverified accounts.
- `POST /authentication/register` no longer signs the user in: it returns `{ user }` with `201` and sets no cookie or session. Clients must call `POST /authentication/login` explicitly.
- `app.has_permission` rewritten as a single query.
- The strict `auth` throttler (`AUTH_THROTTLE_LIMIT`, default 10 per `THROTTLE_TTL_MS`) is now opt-in through `@StrictThrottle()`. Previously it applied to every route outside the authentication controller. `RelaxedThrottleByDefault` was removed.
- The Drizzle row type of the `permissions` table is renamed from `Permission` to `PermissionRecord`; `Permission` is now the code constant.
- New dependencies: `@nestjs/bullmq`, `bullmq`, `ioredis`, `@nestjs/jwt`, `@nestjs/passport`, `passport-*`, `@nestjs/throttler`, `argon2`, `helmet`, `cookie-parser`, `nodemailer`.
