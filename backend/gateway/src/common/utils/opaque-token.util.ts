import { createHash, randomBytes } from 'node:crypto';

const OPAQUE_TOKEN_BYTES = 32;

/** A random token to put in a link plus the hash that is safe to store. */
export interface GeneratedOpaqueToken {
  /** Raw value. Goes only into the emailed link or cookie, never into the database or logs. */
  token: string;
  /** Lowercase hex SHA-256 of `token`. */
  hash: string;
}

/** Lowercase hex SHA-256. High entropy tokens need no salt. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 32 random bytes as base64url (43 characters) with the hash to store. */
export function generateOpaqueToken(): GeneratedOpaqueToken {
  const token = randomBytes(OPAQUE_TOKEN_BYTES).toString('base64url');
  return { token, hash: hashToken(token) };
}
