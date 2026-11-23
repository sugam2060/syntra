import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUuid } from '../utils/uuid.util';
import { REQUIRED_PERMISSION_KEY } from '../../authorization/decorators/required-permission.decorator';
import { PermissionService } from '../../authorization/permission.service';
import type { PermissionRequirement, WorkspaceRequest } from '../../authorization/types';

/** Message of the single 403 body, shared by every denial reason. */
export const PERMISSION_DENIED_MESSAGE = 'You do not have permission to perform this action';

/**
 * Registered globally, last (after `ApiKeyGuard` and `JwtAuthGuard`). Does nothing unless the route (or its controller)
 * carries `@RequiredPermission(...)`; then it checks the caller against the workspace in the
 * `:workspaceId` route parameter.
 *
 * Responses: 401 without an authenticated user, 400 for a missing or malformed workspace id,
 * and one identical 403 for a non-member, a missing permission and an unknown workspace so the
 * API does not reveal which workspaces exist.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionRequirement | undefined>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    if (!request.user) throw new UnauthorizedException();

    const workspaceId: unknown = request.params?.workspaceId;
    if (!isUuid(workspaceId)) {
      throw new BadRequestException('The workspaceId route parameter must be a valid UUID');
    }

    // An API key is limited to its own workspace and permissions on top of its creator's rights.
    const { apiKey } = request.user;
    if (
      apiKey &&
      (apiKey.workspaceId !== workspaceId ||
        !required.every((permission) => apiKey.permissions.includes(permission)))
    ) {
      throw new ForbiddenException(PERMISSION_DENIED_MESSAGE);
    }

    const allowed = await this.permissions.hasAll(request.user.userId, workspaceId, required);
    if (!allowed) throw new ForbiddenException(PERMISSION_DENIED_MESSAGE);

    request.workspaceId = workspaceId;
    return true;
  }
}
