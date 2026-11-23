# 03 — Verify email

Route `/verify-email?token=…` · Backend ✅ `POST /api/v1/authentication/verify-email` (204; 400 if invalid, expired or used), `POST resend-verification` (202 always)

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Link in the email goes to `FRONTEND_URL/verify-email?token=…`. The page calls the endpoint on load.
- Success activates the account; the user then signs in (no automatic session).
- Failure (invalid, expired or already used): offer "Resend verification email" which asks for the email address.
- Resend always answers 202, so the UI never reveals whether the account exists: "If an unverified account exists for that address, we sent a new link."

## Prompt

```
Screen: Email verification result page for Syntra. A centered, single-card layout on the plain background (no split panel), card max width 440px, logo above the card.

Create four frames of the same card:

Frame A — Verifying (loading): skeleton ring/spinner in the indigo tint, H1 "Verifying your email…", muted line "This only takes a second."

Frame B — Success: 56px green tinted circle with a check icon, H1 "Email verified", body "Your account is active. Sign in to get started.", primary full-width button "Continue to sign in".

Frame C — Link invalid or expired: 56px warning tinted circle with a clock icon, H1 "This link has expired", body "Verification links are valid for 24 hours and can be used once.", a field "Email" and a primary button "Send a new link", ghost link "Back to sign in".

Frame D — New link sent confirmation inside the same card: mail icon, H1 "Check your inbox", body "If an unverified account exists for that address, we sent a new link.", muted "The previous link no longer works." and a ghost button "Back to sign in".

Light theme; include one dark frame of Frame B.
```
