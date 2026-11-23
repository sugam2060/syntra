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
- Authorization module (`src/authorization`, see its `README.md`): `@RequiredPermission(Permission.X, ...)` decorator (several codes = all required, handler overrides controller), `@WorkspaceId()` parameter decorator, global `PermissionGuard` (third `APP_GUARD`, after `ThrottlerGuard` and `JwtAuthGuard`) and `PermissionService.hasAll` (one query through `app.has_permission`). The guard is opt-in: routes without the decorator are not checked. Responses: `401` without a user, `400` for a missing or non-UUID `:workspaceId`, one identical `403` for non-member, missing permission and unknown workspace.
- `Permission` constant (`src/database/schemas/workspace/permission-keys.ts`) with the 18 permission codes, plus `PermissionKey` and `PERMISSION_KEYS` derived from it. Adding a code needs one line there and one seed row in a new custom migration; `test/database/rls.e2e-spec.ts` fails if they drift.

### Changed

- New accounts start with `is_active = false` and become active only when the email is verified (`verify-email`; also by password reset or by linking Google). `app.auth_create_user` sets `is_active` from the verified flag. Administrator-disabled accounts (inactive but verified) stay disabled.
- `POST /authentication/login` returns `403` with `error: EMAIL_NOT_VERIFIED` for a correct password on an unverified account.
- `POST /authentication/resend-verification` is now public and takes `{ email }`, because unverified accounts cannot sign in. New SQL function `app.auth_create_verification_token`; `app.auth_create_reset_token` now also serves unverified accounts.
- `POST /authentication/register` no longer signs the user in: it returns `{ user }` with `201` and sets no cookie or session. Clients must call `POST /authentication/login` explicitly.
- `app.has_permission` rewritten as a single query.
- The strict `auth` throttler (`AUTH_THROTTLE_LIMIT`, default 10 per `THROTTLE_TTL_MS`) is now opt-in through `@StrictThrottle()`. Previously it applied to every route outside the authentication controller. `RelaxedThrottleByDefault` was removed.
- The Drizzle row type of the `permissions` table is renamed from `Permission` to `PermissionRecord`; `Permission` is now the code constant.
- New dependencies: `@nestjs/bullmq`, `bullmq`, `ioredis`, `@nestjs/jwt`, `@nestjs/passport`, `passport-*`, `@nestjs/throttler`, `argon2`, `helmet`, `cookie-parser`, `nodemailer`.
