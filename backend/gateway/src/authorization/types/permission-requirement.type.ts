import type { PermissionKey } from '../../database/schemas/workspace/permission-keys';

/** Permission codes an endpoint demands. The caller must hold all of them. */
export type PermissionRequirement = readonly [PermissionKey, ...PermissionKey[]];
