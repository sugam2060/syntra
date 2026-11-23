# Authentication module

Email + password and Google sign-in, JWT access tokens, rotating refresh sessions, email verification and password reset. All routes live under the global prefix (`API_PREFIX`, default `api/v1`), controller path `authentication`.

## Endpoints

| Method and path | Auth | Result |
|---|---|---|
| `POST register` | public, strict throttle | `201` `{ user }` only: no token, no cookie, no session. The account is created inactive (`is_active = false`) and a verification email is queued. Verify, then call `login` |
| `POST login` | public, strict throttle | `200` access token + refresh cookie. `403` with `error: EMAIL_NOT_VERIFIED` when the password is right but the email is not verified; generic `401` otherwise |
| `POST refresh` | public, refresh cookie | `200` new access token, refresh token rotated; `401` clears the cookie |
| `POST logout` | public, refresh cookie | `204` always, session revoked, cookie cleared |
| `POST logout-all` | Bearer | `204`, every session of the user revoked |
| `GET me` | Bearer | current user |
| `GET google` | public | `302` to Google |
| `GET callback/google` | public | `302` to `FRONTEND_URL/auth/callback` (or `?error=oauth_failed`) |
| `POST verify-email` | public | `204`, single-use token; marks the email verified and activates the account (`is_active = true`); `400` if invalid or expired |
| `POST resend-verification` | public, strict throttle | `202` always. Body `{ email }`; sends a new link to an unverified account and invalidates the old one. Public because an unverified account cannot sign in |
| `POST forgot-password` | public, strict throttle | `202` always (no account enumeration) |
| `POST reset-password` | public, strict throttle | `204`, password set, email marked verified, all sessions revoked; `400` if token invalid |

Every route needs a Bearer token unless marked `@Public()` (global `JwtAuthGuard`). "Strict throttle" means the route carries `@StrictThrottle()` and is limited by the `auth` throttler (`AUTH_THROTTLE_LIMIT`, default 10 per `THROTTLE_TTL_MS`). The strict throttler is opt-in; all other routes only use the `default` throttler. Errors are JSON `{ statusCode, error, message }` from `AllExceptionsFilter`; duplicate email on register is `409`.

Request limits (DTOs): email max 254 characters, lowercased and trimmed; password 10 to 128 characters; register `name` optional, max 100.

## Account activation

`users.is_active` means "may sign in".

- Register creates the account with `is_active = false` and `email_verified_at = NULL`.
- Verifying the email (`verify-email`) sets `email_verified_at` and `is_active = true`.
- A password reset also verifies and activates a never-verified account, because the link proves the user owns the mailbox. Linking a Google account to a never-verified local account does the same.
- OAuth sign-up creates the user already verified and active.
- An account that is inactive but already verified was disabled by an administrator. It cannot log in, link Google, or receive a reset email, and activation never re-enables it.
- Login with a correct password on a pending account returns `403 EMAIL_NOT_VERIFIED`. A wrong password always returns the generic `401`, so the verification state is only shown to whoever knows the password.

## Tokens

- **Access token**: HS256 JWT, 15 minutes by default, returned in the JSON body. Claims: `sub`, `email`, `emailVerified`, plus `iss` and `aud`. It is stateless, so a deactivated user's token stays valid until it expires (up to 15 minutes); `me` and `refresh` do reject inactive users.
- **Refresh token**: 32 random bytes, only its SHA-256 is stored in `sessions`. Sent as an httpOnly, `SameSite=Lax` cookie scoped to `/<prefix>/authentication`.
- **Rotation**: each refresh replaces the session atomically (`app.auth_rotate_session`). Presenting an already-rotated token is treated as theft and revokes every session of that user. Clients must therefore send one refresh at a time (single-flight).

## Google OAuth

1. `GET google` generates a random `state`, stores it in a 10-minute httpOnly cookie and redirects to Google.
2. Google redirects to `GOOGLE_CALLBACK_URL`. `OAuthStateStore` compares the `state` parameter with the cookie (constant time).
3. `loginWithOAuth` then:
   - signs in an already linked account;
   - otherwise links to an existing user with the same email (Google must report it as verified, otherwise `401`). If that local account's email was never verified, its password is deleted, the email is marked verified and its sessions are revoked, which stops someone who pre-registered the victim's email from keeping access;
   - otherwise creates a verified user (`app.auth_create_oauth_user`).
4. The refresh cookie is set and the browser is redirected to the frontend, which calls `POST refresh` for an access token.

Google access and refresh tokens are not stored.

## Database access

Before a user is known (login lookup, refresh, forgot and reset password, OAuth lookup) the repository calls narrow `SECURITY DEFINER` functions in `script/sql/02-security-functions.sql`. Once the user is known, queries run in `DatabaseService.withTenant()` so row level security applies.

## Configuration

See `.env.example`. Required (no default, startup fails without them): `DATABASE_URL`, `JWT_ACCESS_SECRET` (32+ characters), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Validation lives in `src/config/env.validation.ts`. The gateway must listen on port 3000 to match the redirect URI registered with Google, so run the frontend on 3001.

## Email

Verification and password-reset mail is queued on the BullMQ `email` queue (needs Redis and the `ioredis` package; 5 attempts, exponential backoff) and sent by a worker through SMTP. If queueing fails on register or forgot-password the error is logged and the request still succeeds; `resend-verification` surfaces it. Locally, `docker compose up -d mailpit` and read mail at http://localhost:8025.

## Tests

- Unit: `src/authentication/test/` and `src/common/test/` (`npm test`).
- Integration and HTTP: `test/authentication/` (`npm run test:e2e`; needs the containers up and `npm run db:migrate` applied).
