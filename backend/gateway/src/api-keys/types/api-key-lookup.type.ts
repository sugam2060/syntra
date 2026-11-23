/** Row returned by `app.auth_find_api_key`. */
export interface ApiKeyLookup {
  id: string;
  workspaceId: string;
  createdBy: string;
  permissions: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  creatorActive: boolean;
  creatorEmail: string;
  creatorEmailVerified: boolean;
}

/** Outcome of revoking a key; the service turns `missing` into a 404. */
export type RevokeResult = 'revoked' | 'already-revoked' | 'missing';
