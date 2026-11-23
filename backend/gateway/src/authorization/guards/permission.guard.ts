import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUuid } from '../../common/utils/uuid.util';
import { REQUIRED_PERMISSION_KEY } from '../decorators/required-permission.decorator';
import { PermissionService } from '../permission.service';
import type { PermissionRequirement, WorkspaceRequest } from '../types';

/** Message of the single 403 body, shared by every denial reason. */
export const PERMISSION_DENIED_MESSAGE = 'You do not have permission to perform this action';

/**
 * Registered globally after `JwtAuthGuard`. Does nothing unless the route (or its controller)
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

    const allowed = await this.permissions.hasAll(request.user.userId, workspaceId, required);
    if (!allowed) throw new ForbiddenException(PERMISSION_DENIED_MESSAGE);

    request.workspaceId = workspaceId;
    return true;
  }
}
