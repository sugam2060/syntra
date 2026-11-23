# 15 — Account and security

Route `/account` · Backend ✅ `GET authentication/me` (user + `hasPassword` + `providers[]`), `POST change-password`, `POST google/link`, `DELETE google`, `POST logout`, `POST logout-all`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Change password: body `{ currentPassword?, newPassword }`, 10–128 chars. Account with a password must give the current one (400 missing, 403 wrong, 400 if unchanged). An OAuth-only account has no current password and is **adding** a first password. Success revokes every other session and keeps this device signed in.
- Link Google: `POST google/link` returns `{ url }`; the frontend sends the browser there. Return to `/auth/callback?linked=google` (success), `?error=oauth_link_failed` (that Google account already belongs to another user) or `?error=oauth_failed`.
- Unlink Google: 404 if not linked, 409 if it is the only way to sign in (no password and no other provider) → disable the button with an explanation.
- "Sign out" (this device) and "Sign out of all devices" (`logout-all`).
- Strict rate limit on change-password and google/link.

## Prompt

```
Screen set: Account and security for Syntra, standard app shell, page "Account" with a left sub-navigation (Profile, Security (active), Notifications greyed "Soon") and a content column max 720px.

Frame A — Security page:
1. H1 "Security", muted "Manage how you sign in."
2. Card "Email": shows maya@acme.com with a green "Verified" badge.
3. Card "Password": row with a lock icon, "Password set", muted "Use at least 10 characters", button "Change password". An alternate state for OAuth-only accounts: "No password set. Add one to also sign in with email." with a button "Add password".
4. Card "Connected accounts": a row with the Google G logo, "Google", muted "Linked · maya@gmail.com", and a ghost danger button "Unlink". Alternate state: "Not connected" with a secondary button "Link Google account". Disabled unlink variant with tooltip "Add a password first — Google is your only way to sign in."
5. Card "Sessions": explanation "Signing out of all devices ends every active session, including this one." buttons "Sign out" (secondary) and "Sign out of all devices" (destructive outline).

Frame B — Change password dialog (480px): fields "Current password" (hidden for OAuth-only accounts), "New password" with strength meter, "Confirm new password"; helper "You'll stay signed in here. Other devices will be signed out." Buttons "Cancel" and "Update password". Error variants: "Current password is incorrect." and "New password must be different from the current one."

Frame C — Success toast "Password updated. Other devices were signed out."

Frame D — Link Google result banners at the top of the page: success "Google account linked." (green), failure "That Google account is already linked to another user." (danger), generic failure "Couldn't link Google. Try again." (danger).

Frame E — Confirm unlink dialog: "Unlink Google?", body "You'll sign in with your email and password instead.", destructive "Unlink".
Frame F — Confirm "Sign out of all devices" dialog. Frame G — loading skeleton. Frame H — mobile (390px).
Light theme plus one dark frame of Frame A.
```
