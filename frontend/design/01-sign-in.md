# 01 — Sign in

Route `/login` · Backend ✅ `POST /api/v1/authentication/login`, `GET /api/v1/authentication/google`, `POST refresh`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Email + password form and a "Continue with Google" button (full-page redirect to `GET authentication/google`).
- Wrong credentials: generic 401, message "Incorrect email or password."
- Correct password but unverified email: 403 `EMAIL_NOT_VERIFIED` → show an info banner "Verify your email to sign in" with a "Resend verification email" action (`POST resend-verification`, always answers 202).
- Strict rate limit: 429 → "Too many attempts. Try again in a minute."
- Return from Google with `?error=oauth_failed` → danger banner "Google sign-in didn't complete. Try again."
- Password 10–128 characters, email max 254.

## Prompt

```
Screen: Sign in page for Syntra.

Layout (desktop 1440): split screen. Left 50%: centered auth card, max width 400px. Right 50%: a product showcase panel with a soft indigo-to-violet tinted background (#4F46E5 at 8% over the surface color) containing a stylized, cropped preview of the Kanban board UI (not an illustration) and a short quote-style value line: "Plan less. Ship more. Let AI handle the busywork." with the Syntra sparkle logo mark above. On mobile the right panel disappears and the card fills the screen.

Left card content, top to bottom:
1. Syntra logo (a small indigo rounded square with a sparkle) and wordmark.
2. H1 "Welcome back" and muted line "Sign in to your workspace".
3. Full-width secondary button "Continue with Google" with the Google G icon.
4. Divider with the word "or".
5. Field "Email" (placeholder you@company.com).
6. Field "Password" with a show/hide eye toggle, and a right-aligned "Forgot password?" link on the label row.
7. Full-width primary button "Sign in".
8. Muted footer line: "New to Syntra? Create an account" with the link in primary color.
9. Tiny legal line at the bottom: "By continuing you agree to the Terms and Privacy Policy."

Also render these state variants as separate frames of the same card:
- Default empty.
- Filled with an inline error under Password: "Incorrect email or password."
- Info banner above the form (info color, mail icon): "Verify your email to sign in. We sent a link to maya@acme.com." with a ghost button "Resend email".
- Loading: the Sign in button shows a spinner and is disabled.
- Rate limited banner (warning): "Too many attempts. Try again in a minute."
- Google failure banner (danger): "Google sign-in didn't complete. Try again."
Show light theme; add one dark theme frame.
```
