import type { AuthUserSummary } from './auth-user.type';

/**
 * Body returned by register. It deliberately carries no tokens: registering creates the
 * account only, and the client must call login to start a session.
 */
export interface RegisterResponse {
  user: AuthUserSummary;
}
