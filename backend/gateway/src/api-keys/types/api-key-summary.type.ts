import type { PermissionKey } from '../../database/schemas/workspace/permission-keys';

/** An API key as shown in listings. The key itself is never included. */
export interface ApiKeySummary {
  id: string;
  name: string;
  /** First characters of the key, enough to recognise it. */
  keyPrefix: string;
  permissions: PermissionKey[];
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

/** Returned once at creation; `key` cannot be retrieved again. */
export interface CreatedApiKey extends ApiKeySummary {
  key: string;
}
