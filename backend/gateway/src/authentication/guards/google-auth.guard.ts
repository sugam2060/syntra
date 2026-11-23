import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { AuthCookieService } from '../auth-cookie.service';

const STATE_BYTES = 24;

/**
 * Starts the Google flow (redirect with a fresh `state`) or completes it (callback). Sessions
 * are not used; CSRF protection is the state cookie checked by `OAuthStateStore`.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly cookies: AuthCookieService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext): Record<string, unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    if (this.isCallback(request)) {
      return { session: false };
    }

    const state = randomBytes(STATE_BYTES).toString('base64url');
    const response = http.getResponse<Response>();
    // A fresh sign-in must never complete an abandoned link attempt.
    this.cookies.clearOAuthLink(response);
    this.cookies.setOAuthState(response, state);
    return { session: false, state, prompt: 'select_account' };
  }

  handleRequest<TUser>(error: unknown, user: TUser | false): TUser {
    if (error || !user) {
      throw error instanceof Error ? error : new UnauthorizedException('Google sign-in failed');
    }
    return user;
  }

  private isCallback(request: Request): boolean {
    return typeof request.query.code === 'string' || typeof request.query.error === 'string';
  }
}
