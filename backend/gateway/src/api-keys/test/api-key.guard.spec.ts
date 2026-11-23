import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSION_KEY } from '../../authorization/decorators/required-permission.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { NO_API_KEY } from '../../common/decorators/no-api-key.decorator';
import { ApiKeysService } from '../api-keys.service';
import { ApiKeyGuard } from '../guards/api-key.guard';

const principal = {
  userId: 'u1',
  email: 'a@b.co',
  emailVerified: true,
  apiKey: { id: 'k1', workspaceId: 'w1', permissions: ['ai:use' as const] },
};

function contextFor(authorization: string | undefined) {
  const request: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: { authorization },
  };
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class Probe {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('ApiKeyGuard', () => {
  let authenticate: jest.Mock;
  let reflector: Reflector;
  let guard: ApiKeyGuard;

  const flags = (set: { isPublic?: boolean; noApiKey?: boolean; unguarded?: boolean }) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) return set.isPublic ?? false;
      if (key === NO_API_KEY) return set.noApiKey ?? false;
      if (key === REQUIRED_PERMISSION_KEY) return set.unguarded ? undefined : ['ai:use'];
      return undefined;
    });

  beforeEach(() => {
    authenticate = jest.fn();
    reflector = new Reflector();
    guard = new ApiKeyGuard(reflector, { authenticate } as unknown as ApiKeysService);
  });

  it.each([
    ['no Authorization header', undefined],
    ['a JWT', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.signature'],
    ['a different scheme', 'Basic c2tfYWJj'],
  ])('leaves %s to the JWT guard', async (_label, header) => {
    flags({});
    const { context, request } = contextFor(header);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authenticate).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('authenticates an sk_ key and attaches the principal', async () => {
    flags({});
    authenticate.mockResolvedValue(principal);
    const { context, request } = contextFor('Bearer sk_validkey');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(authenticate).toHaveBeenCalledWith('sk_validkey');
    expect(request.user).toBe(principal);
  });

  it('answers 401 for an sk_ key that does not authenticate, never falling through to JWT', async () => {
    flags({});
    authenticate.mockResolvedValue(null);
    const { context } = contextFor('Bearer sk_bad');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses keys on @NoApiKey routes without touching the database', async () => {
    flags({ noApiKey: true });
    const { context } = contextFor('Bearer sk_validkey');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('refuses keys on routes that declare no permission (default deny), without a database call', async () => {
    flags({ unguarded: true });
    const { context } = contextFor('Bearer sk_validkey');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('ignores the header on public routes', async () => {
    flags({ isPublic: true });
    const { context, request } = contextFor('Bearer sk_anything');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authenticate).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });
});
