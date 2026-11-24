import type { SlugUnavailableReason } from '../types';

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 48;

/** Lowercase letters and digits in groups separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Words the web app uses as route segments, so a workspace may not claim them. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'new',
  'api',
  'app',
  'www',
  'admin',
  'auth',
  'login',
  'logout',
  'register',
  'signup',
  'onboarding',
  'invitations',
  'invite',
  'workspaces',
  'settings',
  'dashboard',
  'billing',
  'help',
  'support',
  'docs',
  'status',
  'static',
  'assets',
  'public',
  'internal',
  'system',
  'root',
]);

export function isValidSlugFormat(slug: string): boolean {
  return (
    slug.length >= SLUG_MIN_LENGTH && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug)
  );
}

/**
 * The format and reserved-word checks that need no database. `taken` is decided separately,
 * by the database, so it is not part of this result.
 */
export function getSlugProblem(slug: string): Exclude<SlugUnavailableReason, 'taken'> | null {
  if (!isValidSlugFormat(slug)) return 'invalid';
  if (RESERVED_SLUGS.has(slug)) return 'reserved';
  return null;
}
