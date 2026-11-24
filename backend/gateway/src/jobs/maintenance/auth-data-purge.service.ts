import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import type { PurgeResult } from './types';

interface PurgeRecord extends Record<string, unknown> {
  sessions_deleted: string | number;
  tokens_deleted: string | number;
  api_keys_deleted: string | number;
}

interface InvitationPurgeRecord extends Record<string, unknown> {
  invitations_deleted: string | number;
}

/**
 * Deletes expired authentication data through `app.auth_purge_expired()` and finished workspace
 * invitations through `app.purge_workspace_invitations()` (both SECURITY DEFINER, because row
 * level security hides other users' rows from the application role). The retention rules live in
 * those functions: expired sessions after a day, spent tokens after a week, revoked or expired
 * API keys after 90 days, accepted, revoked or expired invitations after 30 days. Revoked-but-
 * unexpired sessions are never touched.
 */
@Injectable()
export class AuthDataPurgeService {
  constructor(private readonly database: DatabaseService) {}

  /** Deletes expired rows now and returns how many of each kind were removed. */
  async purge(): Promise<PurgeResult> {
    const { rows } = await this.database.db.execute<PurgeRecord>(
      sql`SELECT * FROM app.auth_purge_expired()`,
    );
    const { rows: invitationRows } = await this.database.db.execute<InvitationPurgeRecord>(
      sql`SELECT app.purge_workspace_invitations() AS invitations_deleted`,
    );
    const row = rows[0];
    // bigint counts arrive as strings from the driver.
    return {
      sessionsDeleted: Number(row?.sessions_deleted ?? 0),
      tokensDeleted: Number(row?.tokens_deleted ?? 0),
      apiKeysDeleted: Number(row?.api_keys_deleted ?? 0),
      invitationsDeleted: Number(invitationRows[0]?.invitations_deleted ?? 0),
    };
  }
}
