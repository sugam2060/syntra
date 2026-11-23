import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { StrictThrottle } from '../common/decorators/strict-throttle.decorator';
import type { AuthenticatedUser } from '../common/types';
import appConfig from '../config/app.config';
import { AuthCookieService } from './auth-cookie.service';
import { AuthenticationService } from './authentication.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';
import { OAuthRedirectFilter } from './filters/oauth-redirect.filter';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type {
  AuthResponse,
  AuthUserSummary,
  OAuthProfile,
  RegisterResponse,
  RequestContext,
} from './types';

const MAX_USER_AGENT_LENGTH = 512;

/**
 * HTTP surface for sign-up, sign-in, token refresh and account recovery.
 *
 * Every route needs a Bearer access token unless it carries `@Public()` (global `JwtAuthGuard`).
 * Routes marked `@StrictThrottle()` use the tighter `auth` throttler. The refresh token only
 * ever travels in an httpOnly cookie (see `AuthCookieService`), never in a body.
 */
@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly cookies: AuthCookieService,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) {}

  /**
   * Creates the account and queues a verification email. Returns the new user only: no access
   * token and no refresh cookie, so the client must call `login` to sign in.
   */
  @Public()
  @StrictThrottle()
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<RegisterResponse> {
    return this.authentication.register(dto);
  }

  @Public()
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authentication.login(dto, this.contextOf(request));
    this.cookies.setRefreshToken(response, result.refreshToken, result.refreshTokenExpiresAt);
    return result.response;
  }

  /**
   * Rotates the refresh cookie and returns a new access token. Clears the cookie on a 401 so
   * a dead token is not resent. Callers must not run two refreshes at once: the second request
   * presents an already-rotated token, which is treated as reuse and revokes all sessions.
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    try {
      const result = await this.authentication.refresh(
        this.cookies.readRefreshToken(request),
        this.contextOf(request),
      );
      this.cookies.setRefreshToken(response, result.refreshToken, result.refreshTokenExpiresAt);
      return result.response;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.cookies.clearRefreshToken(response);
      }
      throw error;
    }
  }

  /** Public on purpose: it authenticates with the refresh cookie, so it works after the access token expired. Always 204. */
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authentication.logout(this.cookies.readRefreshToken(request));
    this.cookies.clearRefreshToken(response);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authentication.logoutAll(user.userId);
    this.cookies.clearRefreshToken(response);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserSummary> {
    return this.authentication.me(user.userId);
  }

  /** Redirects to Google with a fresh `state` cookie. */
  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  startGoogle(): void {
    // GoogleAuthGuard redirects to Google; this handler is never reached.
  }

  /**
   * Finishes Google sign-in and redirects the browser to `FRONTEND_URL/auth/callback` with the
   * refresh cookie set. The frontend then calls `POST refresh` for an access token. Any failure
   * redirects to the same page with `?error=oauth_failed` (see `OAuthRedirectFilter`).
   */
  @Public()
  @UseGuards(GoogleAuthGuard)
  @UseFilters(OAuthRedirectFilter)
  @Get('callback/google')
  async googleCallback(@Req() request: Request, @Res() response: Response): Promise<void> {
    const result = await this.authentication.loginWithOAuth(
      request.user as OAuthProfile,
      this.contextOf(request),
    );
    this.cookies.clearOAuthState(response);
    this.cookies.setRefreshToken(response, result.refreshToken, result.refreshTokenExpiresAt);
    response.redirect(`${this.app.frontendUrl}/auth/callback`);
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    return this.authentication.verifyEmail(dto.token);
  }

  /**
   * Sends a new verification email. Public because an unverified account cannot sign in yet;
   * always `202`, whether or not the email belongs to an unverified account.
   */
  @Public()
  @StrictThrottle()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    return this.authentication.resendVerification(dto.email);
  }

  @Public()
  @StrictThrottle()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    return this.authentication.forgotPassword(dto.email);
  }

  @Public()
  @StrictThrottle()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authentication.resetPassword(dto.token, dto.password);
  }

  private contextOf(request: Request): RequestContext {
    const userAgent = request.get('user-agent');
    return {
      userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
      ip: request.ip ?? null,
    };
  }
}
