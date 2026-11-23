import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { OAUTH_STATE_COOKIE } from '../auth-cookie.service';

type VerifyCallback = (
  error: Error | null,
  ok?: boolean,
  info?: { message: string },
) => void;

const INVALID_STATE = { message: 'Invalid authorization request state.' };

/**
 * Stateless replacement for passport-oauth2's session-backed state store (this API has no
 * sessions). `GoogleAuthGuard` generates the state and sets it in a short-lived httpOnly
 * cookie; passport then calls `verify` on the callback to compare it with the `state` query
 * parameter Google echoes back. `store` is never reached because the guard always supplies
 * the state; it fails loudly if that ever stops being true.
 */
export class OAuthStateStore {
  store(_request: Request, callback: (error: Error) => void): void {
    callback(new Error('OAuth state must be issued by GoogleAuthGuard'));
  }

  verify(request: Request, providedState: unknown, callback: VerifyCallback): void {
    const expected = (request.cookies as Record<string, unknown> | undefined)?.[
      OAUTH_STATE_COOKIE
    ];
    if (typeof expected !== 'string' || typeof providedState !== 'string') {
      return callback(null, false, INVALID_STATE);
    }

    const a = Buffer.from(expected);
    const b = Buffer.from(providedState);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return callback(null, false, INVALID_STATE);
    }
    callback(null, true);
  }
}
