import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { WorkspaceRequest } from '../types';

/**
 * Injects the workspace id the `PermissionGuard` has already validated. Only available on
 * routes that carry `@RequiredPermission(...)`; pass it to `DatabaseService.withTenant` so row
 * level security applies to the same workspace.
 */
export const WorkspaceId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined =>
    context.switchToHttp().getRequest<WorkspaceRequest>().workspaceId,
);
