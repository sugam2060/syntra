import type { Profile } from 'passport-google-oauth20';
import { GoogleStrategy } from '../strategies/google.strategy';
import { JwtStrategy } from '../strategies/jwt.strategy';

const auth = {
  jwt: { accessSecret: 'k'.repeat(40), accessTtl: '15m', issuer: 'iss', audience: 'aud' },
  refreshTokenTtlDays: 30,
  emailVerificationTtlHours: 24,
  passwordResetTtlMinutes: 30,
  google: { clientId: 'id', clientSecret: 'secret', callbackUrl: 'http://localhost/cb' },
};

describe('JwtStrategy', () => {
  it('maps verified token claims to the authenticated user', () => {
    const strategy = new JwtStrategy(auth);
    expect(strategy.validate({ sub: 'u1', email: 'a@b.co', emailVerified: true })).toEqual({
      userId: 'u1',
      email: 'a@b.co',
      emailVerified: true,
    });
  });
});

describe('GoogleStrategy', () => {
  const strategy = new GoogleStrategy(auth);
  const profile = (over: Record<string, unknown> = {}) =>
    ({
      id: 'g-1',
      displayName: 'Ada Lovelace',
      emails: [{ value: 'ada@example.com' }],
      photos: [{ value: 'https://img.example/ada.png' }],
      _json: { email: 'ada@example.com', email_verified: true },
      ...over,
    }) as unknown as Profile;

  it('normalises the provider profile and drops provider tokens', () => {
    const result = strategy.validate('access-token', 'refresh-token', profile());
    expect(result).toEqual({
      provider: 'google',
      providerAccountId: 'g-1',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada Lovelace',
      avatarUrl: 'https://img.example/ada.png',
    });
    expect(JSON.stringify(result)).not.toContain('access-token');
    expect(JSON.stringify(result)).not.toContain('refresh-token');
  });

  it('reports an unverified email so the service can reject it', () => {
    const result = strategy.validate(
      'a',
      'r',
      profile({ _json: { email: 'ada@example.com', email_verified: false } }),
    );
    expect(result.emailVerified).toBe(false);
  });

  it('throws when Google returns no email at all', () => {
    expect(() =>
      strategy.validate('a', 'r', profile({ emails: undefined, _json: {} })),
    ).toThrow();
  });
});
