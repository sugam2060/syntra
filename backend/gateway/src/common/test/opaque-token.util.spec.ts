import { createHash } from 'node:crypto';
import { generateOpaqueToken, hashToken } from '../utils/opaque-token.util';

describe('opaque-token.util', () => {
  describe('hashToken', () => {
    it('returns the lowercase hex SHA-256 of the token', () => {
      expect(hashToken('abc')).toBe(createHash('sha256').update('abc').digest('hex'));
      expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is deterministic and distinguishes inputs', () => {
      expect(hashToken('a')).toBe(hashToken('a'));
      expect(hashToken('a')).not.toBe(hashToken('b'));
    });
  });

  describe('generateOpaqueToken', () => {
    it('returns a url-safe token and the hash of that token', () => {
      const { token, hash } = generateOpaqueToken();

      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(hash).toBe(hashToken(token));
    });

    it('never repeats', () => {
      const tokens = new Set(Array.from({ length: 50 }, () => generateOpaqueToken().token));
      expect(tokens.size).toBe(50);
    });
  });
});
