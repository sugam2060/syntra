import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import authConfig from '../../config/auth.config';
import type { OAuthProfile } from '../types';
import { OAuthStateStore } from './oauth-state.store';

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean | string;
}

const isTrue = (value: unknown): boolean => value === true || value === 'true';

/** Google OAuth 2.0 login (scopes: profile, email). The profile is mapped by `validate`. */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@Inject(authConfig.KEY) config: ConfigType<typeof authConfig>) {
    super({
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
      scope: ['profile', 'email'],
      // Stateless CSRF protection; see OAuthStateStore.
      store: new OAuthStateStore(),
    } as ConstructorParameters<typeof Strategy>[0]);
  }

  /**
   * Maps Google's profile to the provider-neutral shape. Google's access and refresh tokens
   * are deliberately dropped: the gateway never calls Google APIs, so it should not hold them.
   */
  validate(_accessToken: string, _refreshToken: string, profile: Profile): OAuthProfile {
    const info = (profile._json ?? {}) as GoogleUserInfo;
    const email = profile.emails?.[0]?.value ?? info.email;
    if (!email) {
      throw new Error('Google did not return an email address');
    }

    return {
      provider: 'google',
      providerAccountId: profile.id,
      email,
      emailVerified: isTrue(info.email_verified),
      name: profile.displayName || null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}
