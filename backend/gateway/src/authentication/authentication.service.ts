import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import appConfig from '../config/app.config';
import authConfig from '../config/auth.config';
import { isUniqueViolation } from '../common/utils/postgres-error.util';
import { EmailProducer } from '../jobs/email/email.producer';
import { AuthenticationRepository } from './authentication.repository';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type {
  AuthResult,
  AuthUserSummary,
  OAuthProfile,
  RegisterResponse,
  RequestContext,
} from './types';

const INVALID_CREDENTIALS = 'Invalid email or password';
const INVALID_SESSION = 'Invalid or expired session';
const INVALID_TOKEN = 'Invalid or expired token';
/** Machine-readable `error` value so clients can offer to resend the verification email. */
export const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;

/**
 * Authentication use cases. Holds the rules; SQL lives in `AuthenticationRepository`, token
 * and password primitives in `TokenService` and `PasswordService`.
 */
@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly repository: AuthenticationRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly emails: EmailProducer,
    @Inject(authConfig.KEY) private readonly auth: ConfigType<typeof authConfig>,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) {}

  /**
   * Creates an inactive, unverified account (`is_active = false` until its email is verified)
   * and queues the verification email. It does not start a session: the caller must verify the
   * email and then log in explicitly. A failure to queue the email is logged, not thrown.
   *
   * @throws ConflictException when the email is already registered.
   */
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const passwordHash = await this.passwords.hash(dto.password);

    let userId: string;
    try {
      userId = await this.repository.createUserWithPassword({
        email: dto.email,
        name: dto.name ?? null,
        passwordHash,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }

    try {
      await this.sendVerificationEmail(userId, dto.email, dto.name ?? null);
    } catch (error) {
      // The account exists; the user can request another email via resend-verification.
      this.logger.warn(`Could not queue verification email: ${this.describe(error)}`);
    }

    return {
      user: {
        id: userId,
        email: dto.email,
        name: dto.name ?? null,
        emailVerified: false,
        avatarUrl: null,
      },
    };
  }

  /**
   * @throws UnauthorizedException with one generic message for an unknown email, an OAuth-only
   * account, a wrong password, or an account disabled by an administrator.
   * @throws ForbiddenException (`error: EMAIL_NOT_VERIFIED`) when the password is correct but the
   * email has not been verified yet. Only the holder of the password learns this.
   */
  async login(dto: LoginDto, context: RequestContext): Promise<AuthResult> {
    const user = await this.repository.findUserByEmail(dto.email);

    // Verify against a dummy hash whenever there is nothing to verify, so response time does
    // not reveal whether the email exists or belongs to an OAuth-only account.
    if (!user?.passwordHash) {
      await this.passwords.verifyAgainstDummy(dto.password);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (!(await this.passwords.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      // Inactive and never verified: still waiting for email verification. Inactive after
      // verification: disabled by an administrator, reported like any failed login.
      if (user.emailVerifiedAt === null) {
        throw new ForbiddenException({
          message: 'Email address is not verified. Check your inbox or request a new verification email.',
          error: EMAIL_NOT_VERIFIED,
        });
      }
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.startSession(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerifiedAt !== null,
        avatarUrl: null,
      },
      context,
    );
  }

  /**
   * Rotates the refresh session. A token that was already rotated is treated as theft: all
   * sessions of that user are revoked and the call fails like any invalid token.
   *
   * @throws UnauthorizedException when the token is missing, unknown, expired, reused, or the user is inactive.
   */
  async refresh(
    presentedToken: string | undefined,
    context: RequestContext,
  ): Promise<AuthResult> {
    if (!presentedToken) throw new UnauthorizedException(INVALID_SESSION);

    const next = this.tokens.generateOpaqueToken();
    const expiresAt = this.tokens.refreshTokenExpiry();
    const rotation = await this.repository.rotateSession(
      this.tokens.hashToken(presentedToken),
      next.hash,
      expiresAt,
      context,
    );

    if (rotation.status === 'reuse') {
      this.logger.warn(`Refresh token reuse detected; revoked all sessions for user ${rotation.userId}`);
    }
    if (rotation.status !== 'ok' || !rotation.userId) {
      throw new UnauthorizedException(INVALID_SESSION);
    }

    const profile = await this.repository.getUserProfile(rotation.userId);
    if (!profile) throw new UnauthorizedException(INVALID_SESSION);

    return this.buildResult(profile, next.token, expiresAt);
  }

  /** Revokes the session behind the cookie. Silent when the token is missing or unknown. */
  async logout(presentedToken: string | undefined): Promise<void> {
    if (!presentedToken) return;
    await this.repository.revokeSessionByHash(this.tokens.hashToken(presentedToken));
  }

  logoutAll(userId: string): Promise<void> {
    return this.repository.revokeAllSessions(userId);
  }

  async me(userId: string): Promise<AuthUserSummary> {
    const profile = await this.repository.getUserProfile(userId);
    if (!profile) throw new UnauthorizedException(INVALID_SESSION);
    return profile;
  }

  /** @throws BadRequestException when the token is unknown, expired or already used. */
  async verifyEmail(token: string): Promise<void> {
    const userId = await this.repository.consumeToken(
      'email_verification',
      this.tokens.hashToken(token),
    );
    if (!userId) throw new BadRequestException(INVALID_TOKEN);
    await this.repository.markEmailVerified(userId);
  }

  /**
   * Queues a new verification email for an account that has not verified yet. Always resolves,
   * whether or not the email exists or is already verified (no account enumeration). Public
   * because an unverified account cannot sign in.
   */
  async resendVerification(email: string): Promise<void> {
    const verification = this.tokens.generateOpaqueToken();
    const expiresAt = new Date(Date.now() + this.auth.emailVerificationTtlHours * MS_PER_HOUR);

    const target = await this.repository.createVerificationTokenForEmail(
      email,
      verification.hash,
      expiresAt,
    );
    if (!target) return;

    try {
      await this.emails.sendVerification({
        email: target.email,
        name: target.name,
        link: `${this.app.frontendUrl}/verify-email?token=${verification.token}`,
      });
    } catch (error) {
      this.logger.warn(`Could not queue verification email: ${this.describe(error)}`);
    }
  }

  /** Always resolves, whether or not the email belongs to an account. */
  async forgotPassword(email: string): Promise<void> {
    const reset = this.tokens.generateOpaqueToken();
    const expiresAt = new Date(Date.now() + this.auth.passwordResetTtlMinutes * MS_PER_MINUTE);

    const target = await this.repository.createResetToken(email, reset.hash, expiresAt);
    if (!target) return;

    try {
      await this.emails.sendPasswordReset({
        email: target.email,
        name: target.name,
        link: `${this.app.frontendUrl}/reset-password?token=${reset.token}`,
      });
    } catch (error) {
      this.logger.warn(`Could not queue password reset email: ${this.describe(error)}`);
    }
  }

  /**
   * Single-use. Also marks the email verified and revokes every session of the user.
   *
   * @throws BadRequestException when the token is unknown, expired or already used.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.repository.consumeToken(
      'password_reset',
      this.tokens.hashToken(token),
    );
    if (!userId) throw new BadRequestException(INVALID_TOKEN);
    await this.repository.resetPassword(userId, await this.passwords.hash(newPassword));
  }

  /**
   * Signs in with a provider profile: linked account first, then an existing user with the same
   * email (linked), otherwise a new verified user. Linking to a local account whose email was
   * never verified deletes its password and revokes its sessions (pre-registration takeover guard).
   *
   * @throws UnauthorizedException when the provider did not verify the email or the user is inactive.
   */
  async loginWithOAuth(profile: OAuthProfile, context: RequestContext): Promise<AuthResult> {
    if (!profile.emailVerified) {
      throw new UnauthorizedException('The provider has not verified this email address');
    }
    const email = profile.email.trim().toLowerCase();
    const normalised: OAuthProfile = { ...profile, email };

    const linked = await this.repository.findOAuthAccount(profile.provider, profile.providerAccountId);
    if (linked) {
      if (!linked.isActive) throw new UnauthorizedException(INVALID_SESSION);
      return this.startSessionForUser(linked.userId, context);
    }

    const existing = await this.repository.findUserByEmail(email);
    if (existing) {
      // Inactive and verified means disabled by an administrator. Inactive and never verified is
      // a pending sign-up, which linking verifies and activates.
      if (!existing.isActive && existing.emailVerifiedAt !== null) {
        throw new UnauthorizedException(INVALID_SESSION);
      }
      await this.repository.linkOAuthAccount({
        userId: existing.id,
        profile: normalised,
        localEmailUnverified: existing.emailVerifiedAt === null,
      });
      return this.startSessionForUser(existing.id, context);
    }

    const userId = await this.repository.createOAuthUser(normalised);
    return this.startSessionForUser(userId, context);
  }

  private async startSessionForUser(userId: string, context: RequestContext): Promise<AuthResult> {
    const profile = await this.repository.getUserProfile(userId);
    if (!profile) throw new UnauthorizedException(INVALID_SESSION);
    return this.startSession(profile, context);
  }

  private async startSession(user: AuthUserSummary, context: RequestContext): Promise<AuthResult> {
    const refresh = this.tokens.generateOpaqueToken();
    const expiresAt = this.tokens.refreshTokenExpiry();
    await this.repository.createSession(user.id, refresh.hash, expiresAt, context);
    return this.buildResult(user, refresh.token, expiresAt);
  }

  private async buildResult(
    user: AuthUserSummary,
    refreshToken: string,
    refreshTokenExpiresAt: Date,
  ): Promise<AuthResult> {
    const access = await this.tokens.signAccessToken({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    });
    return {
      response: {
        accessToken: access.token,
        tokenType: 'Bearer',
        expiresIn: access.expiresIn,
        user,
      },
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  private async sendVerificationEmail(
    userId: string,
    email: string,
    name: string | null,
  ): Promise<void> {
    const verification = this.tokens.generateOpaqueToken();
    const expiresAt = new Date(
      Date.now() + this.auth.emailVerificationTtlHours * MS_PER_HOUR,
    );
    await this.repository.createVerificationToken(userId, verification.hash, expiresAt);
    await this.emails.sendVerification({
      email,
      name,
      link: `${this.app.frontendUrl}/verify-email?token=${verification.token}`,
    });
  }

  private describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
