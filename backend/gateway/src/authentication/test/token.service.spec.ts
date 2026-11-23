import { JwtService } from '@nestjs/jwt';
import { TokenService } from '../token.service';

const config = {
  jwt: {
    accessSecret: 'x'.repeat(40),
    accessTtl: '15m',
    issuer: 'syntra-gateway',
    audience: 'syntra-api',
  },
  refreshTokenTtlDays: 30,
  emailVerificationTtlHours: 24,
  passwordResetTtlMinutes: 30,
  google: { clientId: 'id', clientSecret: 'secret', callbackUrl: 'http://localhost/cb' },
};

describe('TokenService', () => {
  const jwtService = new JwtService({
    secret: config.jwt.accessSecret,
    signOptions: {
      algorithm: 'HS256',
      expiresIn: '15m',
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    },
  });
  const service = new TokenService(jwtService, config);

  it('signs an HS256 access token with the expected claims and a 15 minute lifetime', async () => {
    const { token, expiresIn } = await service.signAccessToken({
      id: 'user-1',
      email: 'a@b.co',
      emailVerified: true,
    });
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
    const payload = jwtService.decode<Record<string, unknown>>(token);

    expect(header.alg).toBe('HS256');
    expect(payload).toMatchObject({
      sub: 'user-1',
      email: 'a@b.co',
      emailVerified: true,
      iss: 'syntra-gateway',
      aud: 'syntra-api',
    });
    expect(expiresIn).toBe(900);
  });

  it('generates unique opaque tokens whose stored hash differs from the token', () => {
    const a = service.generateOpaqueToken();
    const b = service.generateOpaqueToken();
    expect(a.token).not.toEqual(b.token);
    expect(a.token.length).toBeGreaterThanOrEqual(43);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hash).toEqual(service.hashToken(a.token));
    expect(a.hash).not.toContain(a.token);
  });

  it('computes the refresh expiry from the configured number of days', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(service.refreshTokenExpiry(from).toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});
