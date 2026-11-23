export interface TokenPair {
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  /** Raw opaque refresh token; only its hash is persisted. */
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

/** An opaque random token together with the hash that is stored server-side. */
export interface OpaqueToken {
  token: string;
  hash: string;
}
