import { findUnprotectedWorkspaceRoutes, joinRoutePath } from '../route-audit/route-audit.util';
import type { RouteInfo } from '../route-audit/types';

const route = (over: Partial<RouteInfo> = {}): RouteInfo => ({
  controller: 'TaskController',
  handler: 'list',
  httpMethod: 'GET',
  path: '/workspaces/:workspaceId/tasks',
  requiresPermission: false,
  isPublic: false,
  ...over,
});

describe('findUnprotectedWorkspaceRoutes', () => {
  it('flags a workspace route with no permission and no @Public', () => {
    const bad = route();
    expect(findUnprotectedWorkspaceRoutes([bad])).toEqual([bad]);
  });

  it('accepts protected and public workspace routes', () => {
    expect(
      findUnprotectedWorkspaceRoutes([
        route({ requiresPermission: true }),
        route({ isPublic: true }),
      ]),
    ).toEqual([]);
  });

  it('ignores routes that are not scoped to a workspace', () => {
    expect(
      findUnprotectedWorkspaceRoutes([
        route({ path: '/authentication/me' }),
        route({ path: '/tasks' }),
        // A parameter that merely contains the word is not the workspace parameter.
        route({ path: '/workspaces/:workspaceIdx/tasks' }),
      ]),
    ).toEqual([]);
  });
});

describe('joinRoutePath', () => {
  it.each([
    [['workspaces/:workspaceId/api-keys', ':keyId'], '/workspaces/:workspaceId/api-keys/:keyId'],
    [['/a/', '/b/'], '/a/b'],
    [['authentication', ''], '/authentication'],
    [['', undefined], '/'],
    [['a//b', 'c'], '/a/b/c'],
  ])('joins %p into %p', (parts, expected) => {
    expect(joinRoutePath(...parts)).toBe(expected);
  });
});
