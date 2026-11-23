import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../../common/types';
import authConfig from '../../config/auth.config';
import type { AccessTokenPayload } from '../types';

/** Verifies Bearer access tokens (HS256, issuer and audience checked). Backs the global `JwtAuthGuard`. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(@Inject(authConfig.KEY) config: ConfigType<typeof authConfig>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.accessSecret,
      algorithms: ['HS256'],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
  }

  /** Stateless: the signed claims are trusted until the (short) token expires. */
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      email: payload.email,
      emailVerified: payload.emailVerified,
    };
  }
}
