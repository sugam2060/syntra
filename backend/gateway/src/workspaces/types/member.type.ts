import type { PermissionKey } from '../../database/schemas/workspace/permission-keys';

/** A workspace member as shown in the members list. */
export interface MemberSummary {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: { id: string; key: string; name: string };
  /** The workspace owner cannot be demoted, removed or leave. */
  isOwner: boolean;
  joinedAt: Date;
}

export type PermissionEffect = 'allow' | 'deny';

/** A per-member exception to the role: grant (`allow`) or take away (`deny`) one permission. */
export interface PermissionOverride {
  permissionKey: PermissionKey;
  effect: PermissionEffect;
}
