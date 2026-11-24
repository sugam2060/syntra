/** The public page an emailed invitation link opens. */
export const INVITATION_ACCEPT_PATH = "/invitations/accept";

/** The accept page for a token. The token is a secret: never log it or put it in another site's URL. */
export function invitationAcceptPath(token: string): string {
  return `${INVITATION_ACCEPT_PATH}?token=${encodeURIComponent(token)}`;
}

/**
 * The sign-in page that sends the user back to `next` afterwards. `next` is validated again by the
 * login form (`resolveSafeRedirect`), so this only has to encode it.
 */
export function loginPathWithNext(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
