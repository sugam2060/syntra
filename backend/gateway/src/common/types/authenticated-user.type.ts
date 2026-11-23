import type { PermissionKey } from '../../database/schemas/workspace/permission-keys';

/** Present when the request was authenticated with an API key instead of a user session. */
export interface ApiKeyPrincipal {
  id: string;
  /** The only workspace the key may act in. */
  workspaceId: string;
  /** Permissions the key was created with; the creator's current rights further limit them. */
  permissions: readonly PermissionKey[];
}

/**
 * The caller attached to `request.user` after authentication. For an API key, `userId` is the
 * user who created the key and `apiKey` carries the key's own limits.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  emailVerified: boolean;
  apiKey?: ApiKeyPrincipal;
}
