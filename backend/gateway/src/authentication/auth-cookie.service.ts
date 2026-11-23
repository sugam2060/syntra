import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import appConfig from '../config/app.config';

export const REFRESH_COOKIE = 'refresh_token';
export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_LINK_COOKIE = 'oauth_link';

const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * Owns every cookie the authentication module sets (`refresh_token`, `oauth_state`, `oauth_link`).
 * All are httpOnly, SameSite=Lax and scoped to the authentication routes, so the browser never
 * sends them to other endpoints.
 */
@Injectable()
export class AuthCookieService {
  constructor(@Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>) {}

  /** Sets the refresh cookie to expire with its session. `secure` is on only when `NODE_ENV=production`. */
  setRefreshToken(response: Response, token: string, expires: Date): void {
    response.cookie(REFRESH_COOKIE, token, { ...this.baseOptions(), expires });
  }

  readRefreshToken(request: Request): string | undefined {
    return this.read(request, REFRESH_COOKIE);
  }

  clearRefreshToken(response: Response): void {
    response.clearCookie(REFRESH_COOKIE, this.baseOptions());
  }

  /** Short-lived (10 minutes) cookie holding the OAuth `state` value. */
  setOAuthState(response: Response, state: string): void {
    response.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.baseOptions(),
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });
  }

  clearOAuthState(response: Response): void {
    response.clearCookie(OAUTH_STATE_COOKIE, this.baseOptions());
  }

  /** Short-lived signed token that turns the next Google callback into an account link. */
  setOAuthLink(response: Response, intent: string): void {
    response.cookie(OAUTH_LINK_COOKIE, intent, {
      ...this.baseOptions(),
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });
  }

  readOAuthLink(request: Request): string | undefined {
    return this.read(request, OAUTH_LINK_COOKIE);
  }

  clearOAuthLink(response: Response): void {
    response.clearCookie(OAUTH_LINK_COOKIE, this.baseOptions());
  }

  private baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.app.isProduction,
      sameSite: 'lax',
      path: `/${this.app.apiPrefix}/authentication`,
    };
  }

  private read(request: Request, name: string): string | undefined {
    const value = (request.cookies as Record<string, unknown> | undefined)?.[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
