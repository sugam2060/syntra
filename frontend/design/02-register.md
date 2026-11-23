# 02 — Create account

Route `/register` · Backend ✅ `POST /api/v1/authentication/register` (201 `{ user }`, no session), Google sign-up via `GET authentication/google`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Fields: name (required, max 100), email (max 254, trimmed, lowercased), password (10–128 chars).
- Register does **not** sign the user in. The account is inactive until the email link is clicked, so success shows a "Check your email" state with the address and a resend action.
- Duplicate email: 409 → inline error on Email: "An account with this email already exists." with a "Sign in instead" link.
- Strict rate limit (429) as on sign in.
- Password strength meter is client-side only; the hard rule is the 10 character minimum.

## Prompt

```
Screen: Create account page for Syntra, plus its "check your email" success state.

Layout: same split-screen shell as the Sign in page (auth card left, product showcase panel right with the board preview and the line "Your team's AI project manager."). Card max width 400px.

Frame A — Create account form:
1. Logo + wordmark.
2. H1 "Create your account", muted line "Free for teams up to 15 people".
3. Secondary button "Sign up with Google".
4. "or" divider.
5. Field "Full name" (required, no "Optional" tag).
6. Field "Work email".
7. Field "Password" with eye toggle, a 4-segment strength meter below it, and a checklist helper: "At least 10 characters" (check icon turns green when met).
8. Primary full-width button "Create account".
9. Footer: "Already have an account? Sign in".
10. Legal line about Terms and Privacy.

Frame B — Duplicate email error: Email field in error state, message "An account with this email already exists." and an inline "Sign in instead" link.

Frame C — Weak password: Password field with the checklist item unmet and the primary button still enabled but the field showing "Use at least 10 characters."

Frame D — Success "Check your email" state replacing the form inside the same card:
- A 56px circular tinted-indigo icon with a mail glyph.
- H1 "Check your email".
- Body: "We sent a verification link to maya@acme.com. Click it to activate your account." (email in medium weight).
- Primary button "Open Gmail" (secondary style is acceptable) and a ghost button "Resend email" with a 60 second cooldown label "Resend in 42s".
- Muted line: "Wrong address? Start over".

Frame E — Loading state with disabled button and spinner.
Light theme, plus one dark frame of Frame A.
```
