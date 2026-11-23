import { ArgumentsHost, Catch, ExceptionFilter, Inject, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Response } from 'express';
import appConfig from '../../config/app.config';
import { AuthCookieService } from '../auth-cookie.service';

/** The OAuth callback is a browser navigation, so failures redirect instead of returning JSON. */
@Catch()
export class OAuthRedirectFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthRedirectFilter.name);

  constructor(
    private readonly cookies: AuthCookieService,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    this.logger.warn(
      `OAuth callback failed: ${exception instanceof Error ? exception.message : 'unknown error'}`,
    );
    this.cookies.clearOAuthState(response);
    response.redirect(`${this.app.frontendUrl}/auth/callback?error=oauth_failed`);
  }
}
