import { parseTrustProxy } from '../trust-proxy';

describe('parseTrustProxy', () => {
  it.each([
    [undefined, false],
    ['', false],
    ['false', false],
    ['FALSE', false],
    ['true', true],
    [' True ', true],
    ['1', 1],
    ['2', 2],
    ['0', 0],
  ])('maps %p to %p', (raw, expected) => {
    expect(parseTrustProxy(raw)).toBe(expected);
  });

  it.each(['yes', '-1', '1.5', '10.0.0.0/8', 'loopback'])('rejects %p', (raw) => {
    expect(() => parseTrustProxy(raw)).toThrow(/TRUST_PROXY/);
  });
});
