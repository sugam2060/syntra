import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailProducer } from '../../jobs/email/email.producer';
import { AuthenticationRepository } from '../authentication.repository';
import { AuthenticationService, EMAIL_NOT_VERIFIED } from '../authentication.service';
import { PasswordService } from '../password.service';
import { TokenService } from '../token.service';
import type { LoginLookupRow, OAuthProfile, RequestContext } from '../types';

const auth = {
  jwt: { accessSecret: 'k'.repeat(40), accessTtl: '15m', issuer: 'iss', audience: 'aud' },
  refreshTokenTtlDays: 30,
  emailVerificationTtlHours: 24,
  passwordResetTtlMinutes: 30,
  google: { clientId: 'id', clientSecret: 'secret', callbackUrl: 'http://localhost/cb' },
};
const app = {
  port: 3000,
  apiPrefix: 'api/v1',
  frontendUrl: 'http://localhost:3001',
  isProduction: false,
  trustProxy: false,
  maintenance: { authCleanupCron: '0 3 * * *' },
  throttle: { ttlMs: 60_000, limit: 120, authLimit: 10 },
};
const context: RequestContext = { userAgent: 'jest', ip: '127.0.0.1' };

type RepositoryMock = { [K in keyof AuthenticationRepository]: jest.Mock };

function buildRepository(): RepositoryMock {
  return {
    findUserByEmail: jest.fn(),
    createUserWithPassword: jest.fn(),
    createSession: jest.fn().mockResolvedValue(undefined),
    rotateSession: jest.fn(),
    revokeSessionByHash: jest.fn().mockResolvedValue(undefined),
    revokeAllSessions: jest.fn().mockResolvedValue(undefined),
    getUserProfile: jest.fn(),
    createVerificationToken: jest.fn().mockResolvedValue(undefined),
    createVerificationTokenForEmail: jest.fn(),
    consumeToken: jest.fn(),
    markEmailVerified: jest.fn().mockResolvedValue(undefined),
    createResetToken: jest.fn(),
    resetPassword: jest.fn().mockResolvedValue(undefined),
    findOAuthAccount: jest.fn(),
    linkOAuthAccount: jest.fn().mockResolvedValue(undefined),
    createOAuthUser: jest.fn(),
    getSignInMethods: jest.fn(),
    replacePassword: jest.fn().mockResolvedValue(undefined),
    unlinkOAuthAccount: jest.fn(),
  } as RepositoryMock;
}

const profileFor = (id: string, over: Partial<{ emailVerified: boolean; name: string | null }> = {}) => ({
  id,
  email: 'ada@example.com',
  name: over.name ?? 'Ada',
  emailVerified: over.emailVerified ?? true,
  avatarUrl: null,
});

describe('AuthenticationService', () => {
  const passwords = new PasswordService();
  const tokens = new TokenService(
    new JwtService({
      secret: auth.jwt.accessSecret,
      signOptions: { algorithm: 'HS256', expiresIn: '15m', issuer: 'iss', audience: 'aud' },
    }),
    auth,
  );
  let repository: RepositoryMock;
  let emails: { sendVerification: jest.Mock; sendPasswordReset: jest.Mock };
  let service: AuthenticationService;
  let storedHash: string;

  beforeAll(async () => {
    storedHash = await passwords.hash('correct-password-1');
  });

  beforeEach(() => {
    repository = buildRepository();
    emails = {
      sendVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };
    service = new AuthenticationService(
      repository as unknown as AuthenticationRepository,
      passwords,
      tokens,
      emails as unknown as EmailProducer,
      auth,
      app,
    );
  });

  describe('register', () => {
    it('hashes the password and queues a verification email without opening a session', async () => {
      repository.createUserWithPassword.mockResolvedValue('user-1');

      const result = await service.register({
        email: 'ada@example.com',
        password: 'a-long-password',
        name: 'Ada',
      });

      const created = repository.createUserWithPassword.mock.calls[0][0];
      expect(created.passwordHash).toMatch(/^\$argon2id\$/);
      expect(JSON.stringify(created)).not.toContain('a-long-password');
      expect(repository.createVerificationToken).toHaveBeenCalledWith(
        'user-1',
        expect.stringMatching(/^[0-9a-f]{64}$/),
        expect.any(Date),
      );
      expect(emails.sendVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'ada@example.com',
          link: expect.stringMatching(/^http:\/\/localhost:3001\/verify-email\?token=[\w-]+$/),
        }),
      );

      // Registration never logs the user in: the client must call login explicitly.
      expect(repository.createSession).not.toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: 'user-1',
          email: 'ada@example.com',
          name: 'Ada',
          emailVerified: false,
          avatarUrl: null,
        },
      });
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('reports a duplicate email as a conflict', async () => {
      repository.createUserWithPassword.mockRejectedValue({ code: '23505' });
      await expect(
        service.register({ email: 'ada@example.com', password: 'a-long-password' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.createSession).not.toHaveBeenCalled();
    });

    it('still succeeds when the verification email cannot be queued', async () => {
      repository.createUserWithPassword.mockResolvedValue('user-1');
      emails.sendVerification.mockRejectedValue(new Error('redis down'));
      await expect(
        service.register({ email: 'ada@example.com', password: 'a-long-password' }),
      ).resolves.toMatchObject({ user: { id: 'user-1' } });
    });
  });

  describe('login', () => {
    const row = (over: Partial<LoginLookupRow> = {}): LoginLookupRow => ({
      id: 'user-1',
      email: 'ada@example.com',
      name: 'Ada',
      emailVerifiedAt: new Date(),
      isActive: true,
      passwordHash: storedHash,
      ...over,
    });

    it('opens a session for correct credentials', async () => {
      repository.findUserByEmail.mockResolvedValue(row());
      const result = await service.login(
        { email: 'ada@example.com', password: 'correct-password-1' },
        context,
      );
      expect(result.response.user).toMatchObject({ id: 'user-1', emailVerified: true });
      expect(repository.createSession).toHaveBeenCalledTimes(1);
    });

    it('rejects a wrong password with the generic message', async () => {
      repository.findUserByEmail.mockResolvedValue(row());
      await expect(
        service.login({ email: 'ada@example.com', password: 'nope-nope-nope' }, context),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
      expect(repository.createSession).not.toHaveBeenCalled();
    });

    it.each([
      ['unknown email', null],
      ['OAuth-only account', row({ passwordHash: null })],
    ])('rejects %s with the same message and still spends hashing time', async (_label, found) => {
      repository.findUserByEmail.mockResolvedValue(found);
      const dummy = jest.spyOn(passwords, 'verifyAgainstDummy');
      await expect(
        service.login({ email: 'ada@example.com', password: 'correct-password-1' }, context),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
      expect(dummy).toHaveBeenCalledTimes(1);
      dummy.mockRestore();
    });

    describe('accounts that are not active', () => {
      const pending = () => row({ isActive: false, emailVerifiedAt: null });

      it('tells the holder of the right password that the email is not verified yet', async () => {
        repository.findUserByEmail.mockResolvedValue(pending());
        const attempt = service.login(
          { email: 'ada@example.com', password: 'correct-password-1' },
          context,
        );
        await expect(attempt).rejects.toBeInstanceOf(ForbiddenException);
        await expect(attempt).rejects.toMatchObject({
          response: { error: EMAIL_NOT_VERIFIED },
        });
        expect(repository.createSession).not.toHaveBeenCalled();
      });

      it('does not reveal the verification state to someone with the wrong password', async () => {
        repository.findUserByEmail.mockResolvedValue(pending());
        await expect(
          service.login({ email: 'ada@example.com', password: 'wrong-password-123' }, context),
        ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
      });

      it('reports an administrator-disabled account like any failed login', async () => {
        repository.findUserByEmail.mockResolvedValue(
          row({ isActive: false, emailVerifiedAt: new Date() }),
        );
        await expect(
          service.login({ email: 'ada@example.com', password: 'correct-password-1' }, context),
        ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
        expect(repository.createSession).not.toHaveBeenCalled();
      });
    });
  });

  describe('refresh', () => {
    it('rejects a request without a token', async () => {
      await expect(service.refresh(undefined, context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repository.rotateSession).not.toHaveBeenCalled();
    });

    it('rotates the session and returns a new access token', async () => {
      repository.rotateSession.mockResolvedValue({ userId: 'user-1', status: 'ok' });
      repository.getUserProfile.mockResolvedValue(profileFor('user-1'));

      const result = await service.refresh('presented-token', context);

      const [oldHash, newHash] = repository.rotateSession.mock.calls[0];
      expect(oldHash).toBe(tokens.hashToken('presented-token'));
      expect(newHash).toBe(tokens.hashToken(result.refreshToken));
      expect(result.refreshToken).not.toBe('presented-token');
      expect(result.response.accessToken).toEqual(expect.any(String));
    });

    it.each(['reuse', 'invalid'] as const)('rejects a %s rotation', async (status) => {
      repository.rotateSession.mockResolvedValue({ userId: 'user-1', status });
      await expect(service.refresh('presented-token', context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('is a no-op without a cookie and revokes by hash with one', async () => {
      await service.logout(undefined);
      expect(repository.revokeSessionByHash).not.toHaveBeenCalled();
      await service.logout('some-token');
      expect(repository.revokeSessionByHash).toHaveBeenCalledWith(tokens.hashToken('some-token'));
    });
  });

  describe('email verification', () => {
    it('rejects an unusable token', async () => {
      repository.consumeToken.mockResolvedValue(null);
      await expect(service.verifyEmail('t'.repeat(30))).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.markEmailVerified).not.toHaveBeenCalled();
    });

    it('marks the email verified when the token is consumed', async () => {
      repository.consumeToken.mockResolvedValue('user-1');
      await service.verifyEmail('t'.repeat(30));
      expect(repository.consumeToken).toHaveBeenCalledWith(
        'email_verification',
        tokens.hashToken('t'.repeat(30)),
      );
      expect(repository.markEmailVerified).toHaveBeenCalledWith('user-1');
    });

    it('queues a fresh verification email for an unverified account', async () => {
      repository.createVerificationTokenForEmail.mockResolvedValue({
        userId: 'user-1',
        email: 'ada@example.com',
        name: 'Ada',
      });
      await service.resendVerification('ada@example.com');
      expect(repository.createVerificationTokenForEmail).toHaveBeenCalledWith(
        'ada@example.com',
        expect.stringMatching(/^[0-9a-f]{64}$/),
        expect.any(Date),
      );
      expect(emails.sendVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          link: expect.stringMatching(/^http:\/\/localhost:3001\/verify-email\?token=[\w-]+$/),
        }),
      );
    });

    it('answers identically and sends nothing for unknown or already verified emails', async () => {
      repository.createVerificationTokenForEmail.mockResolvedValue(null);
      await expect(service.resendVerification('ghost@example.com')).resolves.toBeUndefined();
      expect(emails.sendVerification).not.toHaveBeenCalled();
    });
  });

  describe('password reset', () => {
    it('answers identically for unknown emails and sends nothing', async () => {
      repository.createResetToken.mockResolvedValue(null);
      await expect(service.forgotPassword('ghost@example.com')).resolves.toBeUndefined();
      expect(emails.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('queues a reset email with a single-use link for known emails', async () => {
      repository.createResetToken.mockResolvedValue({
        userId: 'user-1',
        email: 'ada@example.com',
        name: 'Ada',
      });
      await service.forgotPassword('ada@example.com');
      expect(emails.sendPasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          link: expect.stringMatching(/^http:\/\/localhost:3001\/reset-password\?token=[\w-]+$/),
        }),
      );
    });

    it('rejects an unusable reset token', async () => {
      repository.consumeToken.mockResolvedValue(null);
      await expect(service.resetPassword('t'.repeat(30), 'brand-new-password')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.resetPassword).not.toHaveBeenCalled();
    });

    it('stores only the hash of the new password', async () => {
      repository.consumeToken.mockResolvedValue('user-1');
      await service.resetPassword('t'.repeat(30), 'brand-new-password');
      const [userId, hash] = repository.resetPassword.mock.calls[0];
      expect(userId).toBe('user-1');
      expect(hash).toMatch(/^\$argon2id\$/);
      expect(hash).not.toContain('brand-new-password');
    });
  });

  describe('me', () => {
    it('adds how the user can sign in to the profile', async () => {
      repository.getUserProfile.mockResolvedValue(profileFor('user-1'));
      repository.getSignInMethods.mockResolvedValue({ passwordHash: null, providers: ['google'] });

      await expect(service.me('user-1')).resolves.toMatchObject({
        id: 'user-1',
        hasPassword: false,
        providers: ['google'],
      });
    });

    it('rejects an inactive or unknown user', async () => {
      repository.getUserProfile.mockResolvedValue(null);
      await expect(service.me('user-1')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    const dto = { currentPassword: 'correct-password-1', newPassword: 'a-brand-new-passphrase' };

    beforeEach(() => {
      repository.getUserProfile.mockResolvedValue(profileFor('user-1'));
    });

    it('verifies the current password, stores only a hash, and returns a fresh session', async () => {
      repository.getSignInMethods.mockResolvedValue({ passwordHash: storedHash, providers: [] });

      const result = await service.changePassword('user-1', dto, context);

      const [userId, hash] = repository.replacePassword.mock.calls[0];
      expect(userId).toBe('user-1');
      expect(hash).toMatch(/^\$argon2id\$/);
      expect(hash).not.toContain('a-brand-new-passphrase');
      // Old sessions are revoked inside replacePassword; the caller continues on a new one.
      expect(repository.createSession).toHaveBeenCalledTimes(1);
      expect(result.response.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken.length).toBeGreaterThanOrEqual(43);
    });

    it('rejects a wrong current password without changing anything', async () => {
      repository.getSignInMethods.mockResolvedValue({ passwordHash: storedHash, providers: [] });
      await expect(
        service.changePassword('user-1', { ...dto, currentPassword: 'wrong-password-x' }, context),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.replacePassword).not.toHaveBeenCalled();
    });

    it('requires the current password when the account has one', async () => {
      repository.getSignInMethods.mockResolvedValue({ passwordHash: storedHash, providers: [] });
      await expect(
        service.changePassword('user-1', { newPassword: dto.newPassword }, context),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.replacePassword).not.toHaveBeenCalled();
    });

    it('refuses to reuse the current password', async () => {
      repository.getSignInMethods.mockResolvedValue({ passwordHash: storedHash, providers: [] });
      await expect(
        service.changePassword(
          'user-1',
          { currentPassword: 'correct-password-1', newPassword: 'correct-password-1' },
          context,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lets an OAuth-only user add a first password without a current one', async () => {
      repository.getSignInMethods.mockResolvedValue({ passwordHash: null, providers: ['google'] });

      await expect(
        service.changePassword('user-1', { newPassword: dto.newPassword }, context),
      ).resolves.toBeDefined();
      expect(repository.replacePassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('linking Google to a signed-in user', () => {
    const profile = (): OAuthProfile => ({
      provider: 'google',
      providerAccountId: 'g-999',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada',
      avatarUrl: null,
    });

    it('builds the Google URL with the registered callback and a state bound to the intent', async () => {
      const { url, state, intent } = await service.startGoogleLink('user-1');

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(parsed.searchParams.get('redirect_uri')).toBe(auth.google.callbackUrl);
      expect(parsed.searchParams.get('client_id')).toBe(auth.google.clientId);
      expect(parsed.searchParams.get('state')).toBe(state);
      expect(parsed.searchParams.get('scope')).toBe('profile email');
      await expect(tokens.verifyLinkIntent(intent, state)).resolves.toBe('user-1');
    });

    it('links the Google account to the user named in the intent', async () => {
      const { state, intent } = await service.startGoogleLink('user-1');

      await expect(service.completeGoogleLink(intent, state, profile())).resolves.toBe('user-1');

      expect(repository.linkOAuthAccount).toHaveBeenCalledWith({
        userId: 'user-1',
        profile: profile(),
        localEmailUnverified: false,
      });
    });

    it('rejects an intent issued for a different state', async () => {
      const { intent } = await service.startGoogleLink('user-1');
      await expect(
        service.completeGoogleLink(intent, 'another-state', profile()),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repository.linkOAuthAccount).not.toHaveBeenCalled();
    });

    it('rejects a garbage or access-token intent', async () => {
      const { token } = await tokens.signAccessToken({ id: 'user-1', email: 'a@b.co', emailVerified: true });
      for (const intent of ['garbage', token]) {
        await expect(
          service.completeGoogleLink(intent, 'state', profile()),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }
    });

    it('reports a Google account that already belongs to another user as a conflict', async () => {
      repository.linkOAuthAccount.mockRejectedValue({ code: '23505' });
      const { state, intent } = await service.startGoogleLink('user-1');
      await expect(service.completeGoogleLink(intent, state, profile())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('unlinkGoogle', () => {
    it('unlinks when another way to sign in remains', async () => {
      repository.unlinkOAuthAccount.mockResolvedValue('unlinked');
      await expect(service.unlinkGoogle('user-1')).resolves.toBeUndefined();
      expect(repository.unlinkOAuthAccount).toHaveBeenCalledWith('user-1', 'google');
    });

    it('answers 404 when nothing is linked', async () => {
      repository.unlinkOAuthAccount.mockResolvedValue('not-linked');
      await expect(service.unlinkGoogle('user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers 409 when it is the only sign-in method', async () => {
      repository.unlinkOAuthAccount.mockResolvedValue('last-sign-in-method');
      await expect(service.unlinkGoogle('user-1')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('loginWithOAuth', () => {
    const google = (over: Partial<OAuthProfile> = {}): OAuthProfile => ({
      provider: 'google',
      providerAccountId: 'g-123',
      email: 'Ada@Example.com',
      emailVerified: true,
      name: 'Ada',
      avatarUrl: null,
      ...over,
    });

    it('refuses a provider email that is not verified', async () => {
      await expect(
        service.loginWithOAuth(google({ emailVerified: false }), context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repository.findOAuthAccount).not.toHaveBeenCalled();
    });

    it('signs in a previously linked account', async () => {
      repository.findOAuthAccount.mockResolvedValue({ userId: 'user-1', isActive: true });
      repository.getUserProfile.mockResolvedValue(profileFor('user-1'));
      const result = await service.loginWithOAuth(google(), context);
      expect(result.response.user.id).toBe('user-1');
      expect(repository.linkOAuthAccount).not.toHaveBeenCalled();
      expect(repository.createOAuthUser).not.toHaveBeenCalled();
    });

    it('rejects a linked but inactive account', async () => {
      repository.findOAuthAccount.mockResolvedValue({ userId: 'user-1', isActive: false });
      await expect(service.loginWithOAuth(google(), context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('links to an existing verified account by email, keeping its password', async () => {
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada',
        emailVerifiedAt: new Date(),
        isActive: true,
        passwordHash: storedHash,
      });
      repository.getUserProfile.mockResolvedValue(profileFor('user-1'));

      await service.loginWithOAuth(google(), context);

      expect(repository.findUserByEmail).toHaveBeenCalledWith('ada@example.com');
      expect(repository.linkOAuthAccount).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', localEmailUnverified: false }),
      );
    });

    it('flags an unverified local account so its pre-registered password is removed', async () => {
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'ada@example.com',
        name: null,
        emailVerifiedAt: null,
        isActive: true,
        passwordHash: storedHash,
      });
      repository.getUserProfile.mockResolvedValue(profileFor('user-1'));

      await service.loginWithOAuth(google(), context);

      expect(repository.linkOAuthAccount).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', localEmailUnverified: true }),
      );
    });

    it('links to a pending (inactive, never verified) local account so it becomes active', async () => {
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'ada@example.com',
        name: null,
        emailVerifiedAt: null,
        isActive: false,
        passwordHash: storedHash,
      });
      repository.getUserProfile.mockResolvedValue(profileFor('user-1'));

      await expect(service.loginWithOAuth(google(), context)).resolves.toBeDefined();

      expect(repository.linkOAuthAccount).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', localEmailUnverified: true }),
      );
    });

    it('rejects an account an administrator has disabled (inactive but verified)', async () => {
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findUserByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada',
        emailVerifiedAt: new Date(),
        isActive: false,
        passwordHash: storedHash,
      });

      await expect(service.loginWithOAuth(google(), context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repository.linkOAuthAccount).not.toHaveBeenCalled();
    });

    it('creates a verified user for a first-time provider email', async () => {
      repository.findOAuthAccount.mockResolvedValue(null);
      repository.findUserByEmail.mockResolvedValue(null);
      repository.createOAuthUser.mockResolvedValue('user-2');
      repository.getUserProfile.mockResolvedValue(profileFor('user-2'));

      const result = await service.loginWithOAuth(google(), context);

      expect(repository.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'ada@example.com', providerAccountId: 'g-123' }),
      );
      expect(result.response.user.id).toBe('user-2');
    });
  });
});
