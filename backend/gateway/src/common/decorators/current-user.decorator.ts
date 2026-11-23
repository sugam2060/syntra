import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types';

/** Injects the authenticated user (set by the JWT strategy) into a handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>()
      .user,
);
