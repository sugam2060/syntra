import { API_KEY_PREFIX, generateApiKey, hashApiKey, looksLikeApiKey } from '../api-key.util';

describe('api key utilities', () => {
  it('generates an sk_ key with 256 bits of randomness', () => {
    const { key } = generateApiKey();
    expect(key).toMatch(/^sk_[A-Za-z0-9_-]{43}$/);
  });

  it('never repeats a key', () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateApiKey().key));
    expect(keys.size).toBe(50);
  });

  it('stores only a hash and a short display prefix, never the key', () => {
    const { key, keyHash, keyPrefix } = generateApiKey();
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(keyHash).toBe(hashApiKey(key));
    expect(keyPrefix).toBe(key.slice(0, 11));
    expect(keyPrefix.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(key).not.toContain(keyHash);
    expect(keyHash).not.toContain(key.slice(3));
  });

  it('recognises key-shaped bearer tokens only', () => {
    expect(looksLikeApiKey('sk_abc')).toBe(true);
    expect(looksLikeApiKey('eyJhbGciOiJIUzI1NiJ9.e30.sig')).toBe(false);
    expect(looksLikeApiKey(undefined)).toBe(false);
  });
});
