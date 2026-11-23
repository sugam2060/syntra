import type { AuthUserSummary } from './auth-user.type';

/** Body returned by register, login and refresh. The refresh token travels in a cookie. */
export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds. */
  expiresIn: number;
  user: AuthUserSummary;
}

/** What the service hands the controller: the body plus the cookie material. */
export interface AuthResult {
  response: AuthResponse;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
