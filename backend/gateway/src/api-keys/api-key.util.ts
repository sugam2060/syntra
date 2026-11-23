import { createHash, randomBytes } from 'node:crypto';

/** Every key starts with this; `ApiKeyGuard` uses it to tell keys from JWTs. */
export const API_KEY_PREFIX = 'sk_';
const API_KEY_BYTES = 32;
/** `sk_` plus 8 characters: long enough to recognise a key, far too short to guess it. */
const DISPLAY_PREFIX_LENGTH = API_KEY_PREFIX.length + 8;

export interface GeneratedApiKey {
  /** Shown to the user once. */
  key: string;
  keyPrefix: string;
  /** What is stored; the key cannot be recovered from it. */
  keyHash: string;
}

/** SHA-256 is enough because the key is 256 bits of randomness, not a human-chosen secret. */
export const hashApiKey = (key: string): string =>
  createHash('sha256').update(key).digest('hex');

/** Creates a key from 32 random bytes. Store `keyHash` and `keyPrefix`; show `key` once. */
export function generateApiKey(): GeneratedApiKey {
  const key = `${API_KEY_PREFIX}${randomBytes(API_KEY_BYTES).toString('base64url')}`;
  return { key, keyPrefix: key.slice(0, DISPLAY_PREFIX_LENGTH), keyHash: hashApiKey(key) };
}

/** Prefix check only; says nothing about whether the key exists or is valid. */
export const looksLikeApiKey = (token: string | undefined): token is string =>
  typeof token === 'string' && token.startsWith(API_KEY_PREFIX);
