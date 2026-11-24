/** Where to go when no usable `next` was given: the app's front door, which routes the user to their workspace. */
export const DEFAULT_REDIRECT_PATH = "/";

const PLACEHOLDER_ORIGIN = "http://redirect-check.invalid";

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

/**
 * Turns a user-supplied `?next=` value into a path that is safe to navigate to after sign-in, so a
 * crafted link can never bounce the user to another site (open redirect).
 *
 * Accepted: a same-origin absolute path that starts with a single `/` (for example
 * `/invitations/accept?token=abc`). Everything else returns `fallback`:
 * - missing or empty values;
 * - relative values (`foo`), full URLs (`https://evil.com`) and scheme tricks (`javascript:`);
 * - protocol-relative `//evil.com` and `/\evil.com` (browsers read `\` as `/`);
 * - any backslash or control character, because browsers strip tabs and newlines, so `/\t/evil.com` becomes `//evil.com`;
 * - anything that does not resolve back to the same origin once parsed.
 *
 * @param next Raw value of the `next` search parameter.
 * @param fallback Path returned when `next` is not safe. Must itself be a trusted constant.
 */
export function resolveSafeRedirect(
  next: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT_PATH,
): string {
  if (typeof next !== "string" || !next.startsWith("/")) {
    return fallback;
  }
  if (next.startsWith("//") || next.includes("\\") || hasControlCharacter(next)) {
    return fallback;
  }
  try {
    if (new URL(next, PLACEHOLDER_ORIGIN).origin !== PLACEHOLDER_ORIGIN) {
      return fallback;
    }
  } catch {
    return fallback;
  }
  return next;
}
