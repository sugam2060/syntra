# 04 — Forgot and reset password

Forgot password is a **dialog opened from the sign-in page** (no `/forgot-password` route). Reset password is a page at `/reset-password?token=…` · Backend ✅ `POST forgot-password` (202 always), `POST reset-password` (204; 400 bad token)

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Forgot: email only; response is always 202, so the confirmation never reveals whether the account exists.
- Reset link valid 30 minutes, single use. Reset sets the password, marks the email verified and signs out all other sessions, so the success state tells the user to sign in again.
- New password 10–128 characters, with confirm field (client-side match).
- 400 on a bad token: show the expired state with a "Request a new link" button.

## Prompt

```
Screen set: Forgot password and Reset password for Syntra. Centered single-card layout, max width 440px, logo above the card, plain background.

Frame A — Forgot password: H1 "Forgot your password?", muted "Enter your email and we'll send you a reset link.", field "Email", primary full-width button "Send reset link", ghost link with a left arrow "Back to sign in".

Frame B — Link sent (after submit): mail icon in tinted circle, H1 "Check your email", body "If an account exists for maya@acme.com, we sent a link to reset your password. It expires in 30 minutes.", secondary button "Resend link" with a cooldown label, ghost link "Back to sign in".

Frame C — Reset password form: H1 "Set a new password", muted "Choose a password with at least 10 characters.", field "New password" with eye toggle and a 4-segment strength meter, field "Confirm password" (with an error variant "Passwords don't match"), primary full-width button "Reset password". Small muted note: "You'll be signed out of all other devices."

Frame D — Success: green tinted circle with check, H1 "Password updated", body "Sign in with your new password.", primary button "Go to sign in".

Frame E — Invalid or expired link: warning tinted circle, H1 "This reset link is no longer valid", body "Links expire after 30 minutes and work once.", primary button "Request a new link".

Light theme plus one dark frame of Frame C.
```
