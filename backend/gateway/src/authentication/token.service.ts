import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import authConfig from '../config/auth.config';
import type { AccessTokenPayload, OpaqueToken } from './types';

const OPAQUE_TOKEN_BYTES = 32;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
    const token = randomBytes(OPAQUE_TOKEN_BYTES).toString('base64url');
    return { token, hash: this.hashToken(token) };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Expiry for a refresh session starting at `from`, using `REFRESH_TOKEN_TTL_DAYS`. */
  refreshTokenExpiry(from: Date = new Date()): Date {
    return new Date(from.getTime() + this.config.refreshTokenTtlDays * MS_PER_DAY);
  }
}
