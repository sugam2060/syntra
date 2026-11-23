import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { NO_API_KEY } from '../../common/decorators/no-api-key.decorator';
import { REQUIRED_PERMISSION_KEY } from '../../authorization/decorators/required-permission.decorator';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types';
import { looksLikeApiKey } from '../api-key.util';
import { ApiKeysService } from '../api-keys.service';

const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * Registered globally, before `JwtAuthGuard`. A request carrying `Authorization: Bearer sk_...`
 * is authenticated here as an API key and never falls through to JWT validation; anything else
 * is left to the JWT guard. Routes marked `@NoApiKey()` refuse keys with 403.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeys: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
    if (!looksLikeApiKey(token)) return true;

    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;
    if (this.reflector.getAllAndOverride<boolean>(NO_API_KEY, targets)) {
      throw new ForbiddenException('API keys cannot be used for this endpoint');
    }

    // Default deny: a key is only limited to its workspace and permissions on routes that
    // declare a permission, so it may not touch any other route.
    if (this.reflector.getAllAndOverride<unknown>(REQUIRED_PERMISSION_KEY, targets) === undefined) {
      throw new ForbiddenException('API keys can only call permission-protected endpoints');
    }

    const principal = await this.apiKeys.authenticate(token);
    if (!principal) throw new UnauthorizedException('Invalid API key');

    request.user = principal;
    return true;
  }
}
