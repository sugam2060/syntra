/** Claims carried by the access JWT. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  iat?: number;
  exp?: number;
}
