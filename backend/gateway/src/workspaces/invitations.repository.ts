import { Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  PG_NO_DATA_FOUND,
  getPostgresErrorCode,
  getPostgresErrorMessage,
} from '../common/utils/postgres-error.util';
import { toDate } from '../common/utils/date.util';
import { DatabaseService } from '../database/database.service';
import type { TenantTransaction } from '../database/database.types';
import {
  users,
  workspaceInvitations,
  workspaceMembers,
  workspaceRoles,
} from '../database/schemas';
import type {
  AcceptOutcome,
  InvitationPreview,
  InvitationPreviewStatus,
  InvitationReference,
  InvitationSummary,
  MyInvitation,
} from './types';

export interface InvitationContext {
  userId: string;
  workspaceId: string;
}

interface MyInvitationRecord extends Record<string, unknown> {
  invitation_id: string;
  workspace_name: string;
  workspace_slug: string;
  role_name: string;
  inviter_name: string | null;
  expires_at: Date | string;
  created_at: Date | string;
}

interface PreviewRecord extends Record<string, unknown> {
  workspace_name: string;
  role_name: string;
  inviter_name: string | null;
  invited_email: string;
  status: InvitationPreviewStatus;
  expires_at: Date | string;
}

/** Open invitations of a workspace: not accepted and not revoked. Optionally just one of them. */
const selectOpen = (tx: TenantTransaction, workspaceId: string, invitationId?: string) =>
  tx
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      roleId: workspaceRoles.id,
      roleKey: workspaceRoles.key,
      roleName: workspaceRoles.name,
      invitedById: workspaceInvitations.invitedBy,
      inviterName: users.name,
      createdAt: workspaceInvitations.createdAt,
      expiresAt: workspaceInvitations.expiresAt,
    })
    .from(workspaceInvitations)
    .innerJoin(workspaceRoles, eq(workspaceRoles.id, workspaceInvitations.roleId))
    .leftJoin(users, eq(users.id, workspaceInvitations.invitedBy))
    .where(
      and(
        eq(workspaceInvitations.workspaceId, workspaceId),
        isNull(workspaceInvitations.acceptedAt),
        isNull(workspaceInvitations.revokedAt),
        invitationId === undefined ? undefined : eq(workspaceInvitations.id, invitationId),
      ),
    );

type OpenRow = Awaited<ReturnType<typeof selectOpen>>[number];

const toSummary = (row: OpenRow): InvitationSummary => ({
  id: row.id,
  email: row.email,
  role: { id: row.roleId, key: row.roleKey, name: row.roleName },
  invitedBy: { id: row.invitedById, name: row.inviterName },
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  status: row.expiresAt.getTime() > Date.now() ? 'pending' : 'expired',
});

/**
 * Managing invitations runs in `withTenant`, so the policies require `member:invite`. The
 * invitee's side (list, preview, accept, decline) goes through SECURITY DEFINER functions,
 * because an invitee is not a member yet and cannot see or change anything under row level security.
 */
@Injectable()
export class InvitationsRepository {
  constructor(private readonly database: DatabaseService) {}

  /** Open invitations (not accepted, not revoked), newest first. Expired ones are included. */
  list(ctx: InvitationContext): Promise<InvitationSummary[]> {
    return this.database.withTenant(ctx, async (tx) => {
      const rows = await selectOpen(tx, ctx.workspaceId).orderBy(
        desc(workspaceInvitations.createdAt),
      );
      return rows.map(toSummary);
    });
  }

  find(ctx: InvitationContext, invitationId: string): Promise<InvitationSummary | null> {
    return this.database.withTenant(ctx, (tx) => this.findOpen(tx, ctx, invitationId));
  }

  findPendingByEmail(
    ctx: InvitationContext,
    email: string,
  ): Promise<{ id: string; expiresAt: Date } | null> {
    return this.database.withTenant(ctx, async (tx) => {
      const [row] = await tx
        .select({ id: workspaceInvitations.id, expiresAt: workspaceInvitations.expiresAt })
        .from(workspaceInvitations)
        .where(
          and(
            eq(workspaceInvitations.workspaceId, ctx.workspaceId),
            sql`lower(${workspaceInvitations.email}) = lower(${email})`,
            isNull(workspaceInvitations.acceptedAt),
            isNull(workspaceInvitations.revokedAt),
          ),
        );
      return row ?? null;
    });
  }

  /** Whether a user with this email already belongs to the workspace. */
  isMemberEmail(ctx: InvitationContext, email: string): Promise<boolean> {
    return this.database.withTenant(ctx, async (tx) => {
      const rows = await tx
        .select({ userId: workspaceMembers.userId })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(
          and(
            eq(workspaceMembers.workspaceId, ctx.workspaceId),
            sql`lower(${users.email}) = lower(${email})`,
          ),
        )
        .limit(1);
      return rows.length > 0;
    });
  }

  /** A second pending invitation for the same address raises a unique violation. */
  insert(
    ctx: InvitationContext,
    row: { email: string; roleId: string; tokenHash: string; expiresAt: Date },
  ): Promise<InvitationSummary> {
    return this.database.withTenant(ctx, async (tx) => {
      const [created] = await tx
        .insert(workspaceInvitations)
        .values({ ...row, workspaceId: ctx.workspaceId, invitedBy: ctx.userId })
        .returning({ id: workspaceInvitations.id });
      const summary = await this.findOpen(tx, ctx, created.id);
      if (!summary) throw new Error('Invitation vanished after insert');
      return summary;
    });
  }

  /** Replaces the token and expiry of an open invitation. `null` when it is no longer open. */
  rotate(
    ctx: InvitationContext,
    invitationId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<InvitationSummary | null> {
    return this.database.withTenant(ctx, async (tx) => {
      const updated = await tx
        .update(workspaceInvitations)
        .set({ tokenHash, expiresAt })
        .where(
          and(
            eq(workspaceInvitations.id, invitationId),
            eq(workspaceInvitations.workspaceId, ctx.workspaceId),
            isNull(workspaceInvitations.acceptedAt),
            isNull(workspaceInvitations.revokedAt),
          ),
        )
        .returning({ id: workspaceInvitations.id });
      return updated.length > 0 ? this.findOpen(tx, ctx, invitationId) : null;
    });
  }

  /** `false` when the invitation does not exist or is already accepted or revoked. */
  revoke(ctx: InvitationContext, invitationId: string): Promise<boolean> {
    return this.database.withTenant(ctx, async (tx) => {
      const revoked = await tx
        .update(workspaceInvitations)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(workspaceInvitations.id, invitationId),
            eq(workspaceInvitations.workspaceId, ctx.workspaceId),
            isNull(workspaceInvitations.acceptedAt),
            isNull(workspaceInvitations.revokedAt),
          ),
        )
        .returning({ id: workspaceInvitations.id });
      return revoked.length > 0;
    });
  }

  listMine(userId: string): Promise<MyInvitation[]> {
    return this.database.withTenant({ userId }, async (tx) => {
      const { rows } = await tx.execute<MyInvitationRecord>(
        sql`SELECT * FROM app.list_my_workspace_invitations()`,
      );
      return rows.map((row) => ({
        id: row.invitation_id,
        workspaceName: row.workspace_name,
        workspaceSlug: row.workspace_slug,
        roleName: row.role_name,
        inviterName: row.inviter_name,
        createdAt: toDate(row.created_at) as Date,
        expiresAt: toDate(row.expires_at) as Date,
      }));
    });
  }

  /** No user context exists yet on the public preview, so this uses the unscoped connection. */
  async preview(tokenHash: string): Promise<InvitationPreview | null> {
    const { rows } = await this.database.db.execute<PreviewRecord>(
      sql`SELECT * FROM app.preview_workspace_invitation(${tokenHash})`,
    );
    const row = rows[0];
    return row
      ? {
          workspaceName: row.workspace_name,
          roleName: row.role_name,
          inviterName: row.inviter_name,
          invitedEmail: row.invited_email,
          status: row.status,
          expiresAt: toDate(row.expires_at) as Date,
        }
      : null;
  }

  /** The SQL function raises for every refusal; they are turned into an outcome here. */
  async accept(userId: string, reference: InvitationReference): Promise<AcceptOutcome> {
    const tokenHash = 'tokenHash' in reference ? reference.tokenHash : null;
    const invitationId = 'invitationId' in reference ? reference.invitationId : null;
    try {
      const rows = await this.database.withTenant({ userId }, async (tx) => {
        const result = await tx.execute<{ workspace_id: string }>(
          sql`SELECT app.accept_workspace_invitation(${tokenHash}::text, ${invitationId}::uuid) AS workspace_id`,
        );
        return result.rows;
      });
      return { status: 'accepted', workspaceId: rows[0].workspace_id };
    } catch (error) {
      const code = getPostgresErrorCode(error);
      if (code === PG_NO_DATA_FOUND) return { status: 'invalid' };
      if (
        code === PG_INSUFFICIENT_PRIVILEGE &&
        getPostgresErrorMessage(error).includes('email_not_verified')
      ) {
        return { status: 'email-not-verified' };
      }
      throw error;
    }
  }

  /** `false` when the invitation is not addressed to the caller's verified email or is closed. */
  decline(userId: string, invitationId: string): Promise<boolean> {
    return this.database.withTenant({ userId }, async (tx) => {
      const { rows } = await tx.execute<{ declined: boolean }>(
        sql`SELECT app.decline_workspace_invitation(${invitationId}::uuid) AS declined`,
      );
      return rows[0]?.declined === true;
    });
  }

  private async findOpen(
    tx: TenantTransaction,
    ctx: InvitationContext,
    invitationId: string,
  ): Promise<InvitationSummary | null> {
    const [row] = await selectOpen(tx, ctx.workspaceId, invitationId);
    return row ? toSummary(row) : null;
  }
}
