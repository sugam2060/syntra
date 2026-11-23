import { SetMetadata } from '@nestjs/common';
import type { PermissionRequirement } from '../types';

/** Metadata key under which `@RequiredPermission` stores the codes; read by `PermissionGuard`. */
export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

/**
 * Declares the permission code(s) an endpoint needs, checked by the global `PermissionGuard`
 * against the workspace in the `:workspaceId` route parameter. Several codes mean all are
 * required. A handler decorator overrides one on its controller. Endpoints without the
 * decorator are not permission-checked (they still need a valid access token).
 *
 * @example
 * ```ts
 * @Post(':workspaceId/ai/chat')
 * @RequiredPermission(Permission.AI_USE)
 * chat(@WorkspaceId() workspaceId: string) {}
 * ```
 */
export const RequiredPermission = (...permissions: PermissionRequirement) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permissions);
