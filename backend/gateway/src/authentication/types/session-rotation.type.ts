/**
 * ok      session rotated
 * reuse   an already-revoked token was presented; all sessions of the user were revoked
 * invalid unknown, expired or inactive-user token
 */
export type SessionRotationStatus = 'ok' | 'reuse' | 'invalid';

export interface SessionRotationResult {
  userId: string | null;
  status: SessionRotationStatus;
}
