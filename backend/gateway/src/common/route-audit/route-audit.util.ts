import type { RouteInfo } from './types';

/**
 * Routes that act on a workspace (`:workspaceId` in the path) but declare no permission and are
 * not public. `PermissionGuard` is opt-in, so such a route would be open to every signed-in
 * user; this finds the ones that were probably forgotten.
 */
export function findUnprotectedWorkspaceRoutes(routes: readonly RouteInfo[]): RouteInfo[] {
  return routes.filter(
    (route) =>
      route.path.split('/').includes(':workspaceId') &&
      !route.requiresPermission &&
      !route.isPublic,
  );
}

/** Joins path fragments into one normalised path without duplicate or trailing slashes. */
export function joinRoutePath(...parts: (string | undefined)[]): string {
  const joined = parts
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/|\/$/g, '');
  return `/${joined}`;
}
