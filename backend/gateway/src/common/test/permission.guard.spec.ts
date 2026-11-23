import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_DENIED_MESSAGE,
  PermissionGuard,
} from '../guards/permission.guard';
import { PermissionService } from '../../authorization/permission.service';
import { Permission, REQUIRED_PERMISSION_KEY } from '../../authorization';
import type { WorkspaceRequest } from '../../authorization/types';

const USER = { userId: '0192b1c4-0000-7000-8000-000000000001', email: 'a@b.co', emailVerified: true };
const WORKSPACE = '0192b1c4-0000-7000-8000-0000000000aa';

function buildContext(request: Partial<WorkspaceRequest>) {
  const handler = () => undefined;
  class Controller {}
  const context = {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, handler, Controller };
}

describe('PermissionGuard', () => {
  let hasAll: jest.Mock;
  let reflector: Reflector;
  let guard: PermissionGuard;

  const requiring = (...codes: string[]) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) =>
      key === REQUIRED_PERMISSION_KEY ? (codes.length ? codes : undefined) : undefined,
    );

  beforeEach(() => {
    hasAll = jest.fn();
    reflector = new Reflector();
    guard = new PermissionGuard(reflector, { hasAll } as unknown as PermissionService);
  });

  it('does nothing for routes without the decorator (opt-in)', async () => {
    requiring();
    const { context } = buildContext({ params: {} });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(hasAll).not.toHaveBeenCalled();
  });

  it('answers 401 when no user is attached to the request', async () => {
    requiring(Permission.AI_USE);
    const { context } = buildContext({ params: { workspaceId: WORKSPACE } });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(hasAll).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined],
    ['not a UUID', 'my-workspace'],
    ['an injection attempt', "x'; DROP TABLE users;--"],
  ])('answers 400 without touching the database when workspaceId is %s', async (_label, id) => {
    requiring(Permission.AI_USE);
    const { context } = buildContext({
      user: USER,
      params: id === undefined ? {} : { workspaceId: id },
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(BadRequestException);
    expect(hasAll).not.toHaveBeenCalled();
  });

  it('allows the request and exposes the workspace id when every permission is held', async () => {
    requiring(Permission.AI_USE, Permission.TASK_UPDATE);
    hasAll.mockResolvedValue(true);
    const request: Partial<WorkspaceRequest> = { user: USER, params: { workspaceId: WORKSPACE } };
    const { context } = buildContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(hasAll).toHaveBeenCalledWith(USER.userId, WORKSPACE, ['ai:use', 'task:update']);
    expect(request.workspaceId).toBe(WORKSPACE);
  });

  it('answers a generic 403 when the permission is missing and leaves the request untouched', async () => {
    requiring(Permission.WORKSPACE_DELETE);
    hasAll.mockResolvedValue(false);
    const request: Partial<WorkspaceRequest> = { user: USER, params: { workspaceId: WORKSPACE } };
    const { context } = buildContext(request);

    const attempt = guard.canActivate(context);
    await expect(attempt).rejects.toBeInstanceOf(ForbiddenException);
    await expect(attempt).rejects.toThrow(PERMISSION_DENIED_MESSAGE);
    expect(request.workspaceId).toBeUndefined();
  });

  describe('API key principals', () => {
    const keyUser = (over: { workspaceId?: string; permissions?: string[] } = {}) => ({
      ...USER,
      apiKey: { id: 'k1', workspaceId: WORKSPACE, permissions: ['ai:use', 'task:read'], ...over },
    });

    it('allows a request inside the key scope when the creator still holds the permission', async () => {
      requiring(Permission.AI_USE);
      hasAll.mockResolvedValue(true);
      const request = { user: keyUser(), params: { workspaceId: WORKSPACE } };
      const { context } = buildContext(request as unknown as Partial<WorkspaceRequest>);

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(hasAll).toHaveBeenCalledWith(USER.userId, WORKSPACE, ['ai:use']);
    });

    it('denies a workspace other than the one the key belongs to, without a database call', async () => {
      requiring(Permission.AI_USE);
      const other = '0192b1c4-0000-7000-8000-0000000000bb';
      const request = { user: keyUser(), params: { workspaceId: other } };
      const { context } = buildContext(request as unknown as Partial<WorkspaceRequest>);

      await expect(guard.canActivate(context)).rejects.toThrow(PERMISSION_DENIED_MESSAGE);
      expect(hasAll).not.toHaveBeenCalled();
    });

    it('denies a permission the key was not created with, even if the creator holds it', async () => {
      requiring(Permission.AI_USE, Permission.TASK_UPDATE);
      const request = { user: keyUser(), params: { workspaceId: WORKSPACE } };
      const { context } = buildContext(request as unknown as Partial<WorkspaceRequest>);

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
      expect(hasAll).not.toHaveBeenCalled();
    });

    it('denies when the creator has since lost the permission', async () => {
      requiring(Permission.AI_USE);
      hasAll.mockResolvedValue(false);
      const request = { user: keyUser(), params: { workspaceId: WORKSPACE } };
      const { context } = buildContext(request as unknown as Partial<WorkspaceRequest>);

      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('reads the metadata from the handler first, then the controller', async () => {
    const spy = requiring(Permission.AI_USE);
    hasAll.mockResolvedValue(true);
    const { context, handler, Controller } = buildContext({
      user: USER,
      params: { workspaceId: WORKSPACE },
    });

    await guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith(REQUIRED_PERMISSION_KEY, [handler, Controller]);
  });
});
