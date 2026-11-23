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
| `GET me` | Bearer | `200` the user plus `hasPassword` (boolean) and `providers` (linked social accounts, e.g. `["google"]`) |
| `POST change-password` | Bearer, strict throttle | `200` new access token + refresh cookie (same body as `login`). Body `{ currentPassword?, newPassword }`. Revokes every other session; see Change password |
| `POST google/link` | Bearer, strict throttle | `200` `{ url }`: the Google URL to open. Sets the `oauth_state` and `oauth_link` cookies; see Link and unlink Google |
| `DELETE google` | Bearer | `204`. `404` when no Google account is linked, `409` when it is the only way to sign in |
| `GET google` | public | `302` to Google |
| `GET callback/google` | public | `302` to `FRONTEND_URL/auth/callback`; `?linked=google` after a link, `?error=oauth_link_failed` when the Google account is already linked to a user, `?error=oauth_failed` otherwise |
| `POST verify-email` | public | `204`, single-use token; marks the email verified and activates the account (`is_active = true`); `400` if invalid or expired |
| `POST resend-verification` | public, strict throttle | `202` always. Body `{ email }`; sends a new link to an unverified account and invalidates the old one. Public because an unverified account cannot sign in |
| `POST forgot-password` | public, strict throttle | `202` always (no account enumeration) |
| `POST reset-password` | public, strict throttle | `204`, password set, email marked verified, all sessions revoked; `400` if token invalid |

Every route needs a Bearer token unless marked `@Public()` (global `JwtAuthGuard`). The whole controller is marked `@NoApiKey()`: a request authenticated with an API key (`sk_...`) gets `403` on every route here, so a leaked key cannot touch sign-in, passwords or linked accounts (see `src/api-keys/README.md`). "Strict throttle" means the route carries `@StrictThrottle()` and is limited by the `auth` throttler (`AUTH_THROTTLE_LIMIT`, default 10 per `THROTTLE_TTL_MS`). The strict throttler is opt-in; all other routes only use the `default` throttler. Errors are JSON `{ statusCode, error, message }` from `AllExceptionsFilter`; duplicate email on register is `409`.

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
- **Rotation**: each refresh replaces the session atomically (`app.auth_rotate_session`). The old session gets both `revoked_at` and `rotated_at` (column added in migration `0003_ordinary_wallow.sql`). Clients must send one refresh at a time (single-flight).
- **Reuse vs invalid**: only a token with `rotated_at` set counts as reuse (someone replays a stale copy): it revokes every session of that user and returns `401`. A token revoked by `logout`, `logout-all`, a password change or a password reset has no `rotated_at`; it is simply invalid (`401`) and revokes nothing else, so a device still in use is not signed out. Unknown, expired, or inactive-user tokens are also a plain `401`.
- Sessions that are revoked but not yet expired are kept (reuse detection needs them) and removed by the purge job after they expire; see `src/jobs/maintenance/README.md`.

## Google OAuth

1. `GET google` generates a random `state`, stores it in a 10-minute httpOnly cookie and redirects to Google.
2. Google redirects to `GOOGLE_CALLBACK_URL`. `OAuthStateStore` compares the `state` parameter with the cookie (constant time).
3. `loginWithOAuth` then:
   - signs in an already linked account;
   - otherwise links to an existing user with the same email (Google must report it as verified, otherwise `401`). If that local account's email was never verified, its password is deleted, the email is marked verified and its sessions are revoked, which stops someone who pre-registered the victim's email from keeping access;
   - otherwise creates a verified user (`app.auth_create_oauth_user`).
4. The refresh cookie is set and the browser is redirected to the frontend, which calls `POST refresh` for an access token.

Google access and refresh tokens are not stored.

## Link and unlink Google

For a signed-in user who wants to add Google to an existing account. A browser redirect cannot carry a Bearer header, so the flow starts with a normal API call:

1. `POST google/link` creates a random `state` and a signed intent (a JWT valid 10 minutes, bound to the user and to a hash of `state`, with its own audience `<JWT_AUDIENCE>:oauth-link` so it cannot be used as an access token). It sets the `oauth_state` and `oauth_link` cookies and returns `{ url }`.
2. The frontend sends the browser to `url`.
3. In `callback/google`, when the `oauth_link` cookie is present the handler links instead of signing in. The intent must be valid and match the `state` query parameter, and Google must report the email as verified; otherwise the redirect is `?error=oauth_failed`. The Google email does not have to equal the account email. On success the redirect is `FRONTEND_URL/auth/callback?linked=google`. No session is started and no refresh cookie is set.
4. If that Google account already belongs to a user, the redirect is `?error=oauth_link_failed` and nothing changes.
5. `GET google` (a normal sign-in) clears any `oauth_link` cookie first, so a fresh sign-in never completes an abandoned link attempt.

`DELETE google` removes the link: `404` when Google is not linked, `409` when the user has no password and no other provider.

## Change password

`POST change-password` with `{ currentPassword?, newPassword }` (`newPassword` follows the register limits, 10 to 128 characters):

- Account with a password: `currentPassword` is required (`400` if missing, `403` if wrong) and the new password must differ from it (`400`).
- OAuth-only account: no `currentPassword`; the call adds a first password, which enables email + password login.
- Every session of the user is revoked, then a new session is created for the caller. The response is the same as `login` (access token in the body, new refresh cookie). Other devices must sign in again.

## Database access

Before a user is known (login lookup, refresh, forgot and reset password, OAuth lookup) the repository calls narrow `SECURITY DEFINER` functions in `script/sql/02-security-functions.sql`. Once the user is known, queries run in `DatabaseService.withTenant()` so row level security applies.

Raw `db.execute()` results return timestamps as ISO strings, not `Date` objects (unlike query-builder results). The repository converts them with `toDate` from `src/common/utils/date.util.ts`; use it for any new raw query.

## Configuration

See `.env.example`. `TRUST_PROXY` (default `false`) decides whether `X-Forwarded-For` is trusted for the client IP stored with sessions and used by the rate limiter: set it to the number of proxies in front of the gateway (parsed in `src/config/trust-proxy.ts`, applied in `src/app.setup.ts`). Required (no default, startup fails without them): `DATABASE_URL`, `JWT_ACCESS_SECRET` (32+ characters), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Validation lives in `src/config/env.validation.ts`. The gateway must listen on port 3000 to match the redirect URI registered with Google, so run the frontend on 3001.

## Email

Verification and password-reset mail is queued on the BullMQ `email` queue (needs Redis and the `ioredis` package; 5 attempts, exponential backoff) and sent by a worker through SMTP. If queueing fails on register or forgot-password the error is logged and the request still succeeds; `resend-verification` surfaces it. Locally, `docker compose up -d mailpit` and read mail at http://localhost:8025.

## Tests

- Unit: `src/authentication/test/` and `src/common/test/` (`npm test`).
- Integration and HTTP: `test/authentication/` (`npm run test:e2e`; needs the containers up and `npm run db:migrate` applied). `account-security.e2e-spec.ts` covers `me`, change-password and Google link/unlink; `trust-proxy.e2e-spec.ts` covers `TRUST_PROXY`.
- Manual: `test/postman/authentication.json` (folders 1 to 6 are authentication, folder 7 is API keys).
