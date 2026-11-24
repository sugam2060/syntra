const MAX_ROLE_KEY_LENGTH = 48;

/**
 * Derives the stable key of a custom role from its display name: lowercase ASCII letters and
 * digits separated by single hyphens. Returns an empty string when nothing usable remains, which
 * the caller reports as a bad request.
 */
export function roleKeyFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_ROLE_KEY_LENGTH)
    .replace(/-+$/g, '');
}
