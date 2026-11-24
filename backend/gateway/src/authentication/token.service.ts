import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import authConfig from '../config/auth.config';
import { generateOpaqueToken, hashToken } from '../common/utils/opaque-token.util';
import type { AccessTokenPayload, OpaqueToken } from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LINK_PURPOSE = 'oauth-link';
const LINK_INTENT_TTL_SECONDS = 10 * 60;

/** Identity fields copied into the access token claims. */
export interface AccessTokenSubject {
  id: string;
  email: string;
  emailVerified: boolean;
}

/** Issues HS256 access JWTs and generates and hashes opaque tokens (refresh, verification, reset). */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY) private readonly config: ConfigType<typeof authConfig>,
  ) {}

  /** @returns the signed JWT and its lifetime in seconds (`exp - iat`). */
  async signAccessToken(
    subject: AccessTokenSubject,
  ): Promise<{ token: string; expiresIn: number }> {
    const payload: AccessTokenPayload = {
      sub: subject.id,
      email: subject.email,
      emailVerified: subject.emailVerified,
    };
    const token = await this.jwtService.signAsync(payload);
    const decoded = this.jwtService.decode<AccessTokenPayload>(token);
    const expiresIn = (decoded?.exp ?? 0) - (decoded?.iat ?? 0);
    return { token, expiresIn };
  }

  /** Random opaque token plus the SHA-256 that is safe to store (high entropy, so no salt needed). */
  generateOpaqueToken(): OpaqueToken {
    return generateOpaqueToken();
  }

  /**
   * Signs a 10 minute intent saying "the next Google callback with this `state` links to this
   * user". It carries its own audience, so it is rejected as an access token and vice versa.
   */
  signLinkIntent(userId: string, state: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, purpose: LINK_PURPOSE, sh: this.hashToken(state) },
      { audience: this.linkAudience, expiresIn: LINK_INTENT_TTL_SECONDS },
    );
  }

  /** @returns the user id when the intent is valid and was issued for this `state`, else null. */
  async verifyLinkIntent(intent: string, state: unknown): Promise<string | null> {
    if (typeof state !== 'string') return null;
    try {
      const claims = await this.jwtService.verifyAsync<{
        sub: string;
        purpose: string;
        sh: string;
      }>(intent, { audience: this.linkAudience });
      return claims.purpose === LINK_PURPOSE && claims.sh === this.hashToken(state)
        ? claims.sub
        : null;
    } catch {
      return null;
    }
  }

  private get linkAudience(): string {
    return `${this.config.jwt.audience}:oauth-link`;
  }

  hashToken(token: string): string {
    return hashToken(token);
  }

  /** Expiry for a refresh session starting at `from`, using `REFRESH_TOKEN_TTL_DAYS`. */
  refreshTokenExpiry(from: Date = new Date()): Date {
    return new Date(from.getTime() + this.config.refreshTokenTtlDays * MS_PER_DAY);
  }
}
