import { Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { toDate } from '../common/utils/date.util';
import { DatabaseService } from '../database/database.service';
import { type ApiKeyRecord, apiKeys } from '../database/schemas';
import type { ApiKeyLookup, RevokeResult } from './types';

interface ApiKeyLookupRecord extends Record<string, unknown> {
  api_key_id: string;
  workspace_id: string;
  created_by: string;
  permissions: string[];
  expires_at: Date | string | null;
  revoked_at: Date | string | null;
  creator_active: boolean;
  creator_email: string;
  creator_email_verified: boolean;
}

interface KeyContext {
  userId: string;
  workspaceId: string;
}

/**
 * Key management runs in `withTenant`, so row level security requires the caller to hold
 * `ai:manage_keys`. Authentication-time lookup goes through a SECURITY DEFINER function because
 * no user context exists yet.
 */
@Injectable()
export class ApiKeysRepository {
  constructor(private readonly database: DatabaseService) {}

  /** Row level security rejects the insert unless `ctx.userId` holds `ai:manage_keys`. */
  async insert(
    ctx: KeyContext,
    row: {
      name: string;
      keyPrefix: string;
      keyHash: string;
      permissions: string[];
      expiresAt: Date | null;
    },
  ): Promise<ApiKeyRecord> {
    const [created] = await this.database.withTenant(ctx, (tx) =>
      tx
        .insert(apiKeys)
        .values({ ...row, workspaceId: ctx.workspaceId, createdBy: ctx.userId })
        .returning(),
    );
    return created;
  }

  /** Keys that are neither revoked nor expired. */
  async countActive(ctx: KeyContext): Promise<number> {
    const [row] = await this.database.withTenant(ctx, (tx) =>
      tx
        .select({ total: sql<number>`count(*)::int` })
        .from(apiKeys)
        .where(
          and(
            eq(apiKeys.workspaceId, ctx.workspaceId),
            isNull(apiKeys.revokedAt),
            or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, new Date())),
          ),
        ),
    );
    return row?.total ?? 0;
  }

  list(ctx: KeyContext): Promise<ApiKeyRecord[]> {
    return this.database.withTenant(ctx, (tx) =>
      tx
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.workspaceId, ctx.workspaceId))
        .orderBy(desc(apiKeys.createdAt)),
    );
  }

  /** Sets `revoked_at` on an active key. Distinguishes "already revoked" from "no such key". */
  async revoke(ctx: KeyContext, keyId: string): Promise<RevokeResult> {
    return this.database.withTenant(ctx, async (tx) => {
      const revoked = await tx
        .update(apiKeys)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(apiKeys.id, keyId),
            eq(apiKeys.workspaceId, ctx.workspaceId),
            isNull(apiKeys.revokedAt),
          ),
        )
        .returning({ id: apiKeys.id });
      if (revoked.length > 0) return 'revoked';

      const [existing] = await tx
        .select({ id: apiKeys.id })
        .from(apiKeys)
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.workspaceId, ctx.workspaceId)));
      return existing ? 'already-revoked' : 'missing';
    });
  }

  /**
   * Looks a key up by hash without a user context. Returns revoked and expired keys too; the
   * caller decides. Side effect: the SQL function refreshes `last_used_at` (at most every 5 minutes).
   */
  async findByHash(keyHash: string): Promise<ApiKeyLookup | null> {
    const { rows } = await this.database.db.execute<ApiKeyLookupRecord>(
      sql`SELECT * FROM app.auth_find_api_key(${keyHash})`,
    );
    const row = rows[0];
    return row
      ? {
          id: row.api_key_id,
          workspaceId: row.workspace_id,
          createdBy: row.created_by,
          permissions: row.permissions,
          expiresAt: toDate(row.expires_at),
          revokedAt: toDate(row.revoked_at),
          creatorActive: row.creator_active,
          creatorEmail: row.creator_email,
          creatorEmailVerified: row.creator_email_verified,
        }
      : null;
  }
}
