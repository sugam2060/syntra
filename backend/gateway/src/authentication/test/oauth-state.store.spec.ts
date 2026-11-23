import type { Request } from 'express';
import { OAUTH_STATE_COOKIE } from '../auth-cookie.service';
import { OAuthStateStore } from '../strategies/oauth-state.store';

const requestWith = (cookies?: Record<string, string>) => ({ cookies }) as unknown as Request;

describe('OAuthStateStore', () => {
  const store = new OAuthStateStore();

  const verify = (request: Request, provided: unknown) =>
    new Promise<{ ok?: boolean; error: Error | null }>((resolve) =>
      store.verify(request, provided, (error, ok) => resolve({ ok, error })),
    );

  it('accepts a state that matches the cookie', async () => {
    const result = await verify(requestWith({ [OAUTH_STATE_COOKIE]: 'abc123' }), 'abc123');
    expect(result).toEqual({ ok: true, error: null });
  });

  it.each([
    ['a different state', { [OAUTH_STATE_COOKIE]: 'abc123' }, 'abc124'],
    ['a state of another length', { [OAUTH_STATE_COOKIE]: 'abc123' }, 'abc'],
    ['no cookie', {}, 'abc123'],
    ['no cookie jar', undefined, 'abc123'],
    ['a missing state parameter', { [OAUTH_STATE_COOKIE]: 'abc123' }, undefined],
  ])('rejects %s', async (_label, cookies, provided) => {
    const result = await verify(requestWith(cookies), provided);
    expect(result.ok).toBe(false);
  });

  it('refuses to generate state itself (the guard owns that)', () => {
    const callback = jest.fn();
    store.store(requestWith(), callback);
    expect(callback).toHaveBeenCalledWith(expect.any(Error));
  });
});
