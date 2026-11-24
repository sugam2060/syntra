import { Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import type { TenantTransaction } from '../database/database.types';
import { workspaceMembers, workspaceRoles, workspaces } from '../database/schemas';
import type { MyWorkspace } from './types';

interface WorkspacePatch {
  name?: string;
  slug?: string;
}

const selectMine = (tx: TenantTransaction, userId: string) =>
  tx
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      ownerId: workspaces.ownerId,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
      roleKey: workspaceRoles.key,
      roleName: workspaceRoles.name,
    })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(eq(workspaceMembers.workspaceId, workspaces.id), eq(workspaceMembers.userId, userId)),
    )
    .innerJoin(workspaceRoles, eq(workspaceRoles.id, workspaceMembers.roleId));

type MineRow = Awaited<ReturnType<typeof selectMine>>[number];

const toMyWorkspace = ({ roleKey, roleName, ...workspace }: MineRow): MyWorkspace => ({
  ...workspace,
  role: { key: roleKey, name: roleName },
});

/**
 * All queries run in `withTenant`, so row level security decides what the caller can see or
 * change. A workspace the caller is not a member of is simply absent. Creation goes through
 * `app.create_workspace`, which also inserts the owner's member row atomically.
 */
@Injectable()
export class WorkspacesRepository {
  constructor(private readonly database: DatabaseService) {}

  /** Creates the workspace with the caller as owner. A taken slug raises a unique violation. */
  create(userId: string, input: { name: string; slug: string }): Promise<MyWorkspace> {
    return this.database.withTenant({ userId }, async (tx) => {
      const { rows } = await tx.execute<{ id: string }>(
        sql`SELECT app.create_workspace(${input.name}, ${input.slug}) AS id`,
      );
      const [created] = await selectMine(tx, userId).where(eq(workspaces.id, rows[0].id));
      return toMyWorkspace(created);
    });
  }

  listForUser(userId: string): Promise<MyWorkspace[]> {
    return this.database.withTenant({ userId }, async (tx) => {
      const rows = await selectMine(tx, userId).orderBy(asc(workspaces.name), asc(workspaces.id));
      return rows.map(toMyWorkspace);
    });
  }

  findById(userId: string, workspaceId: string): Promise<MyWorkspace | null> {
    return this.database.withTenant({ userId, workspaceId }, async (tx) => {
      const [row] = await selectMine(tx, userId).where(eq(workspaces.id, workspaceId));
      return row ? toMyWorkspace(row) : null;
    });
  }

  findBySlug(userId: string, slug: string): Promise<MyWorkspace | null> {
    return this.database.withTenant({ userId }, async (tx) => {
      const [row] = await selectMine(tx, userId).where(eq(workspaces.slug, slug));
      return row ? toMyWorkspace(row) : null;
    });
  }

  /** `null` when row level security or a missing row left nothing to update. */
  update(userId: string, workspaceId: string, patch: WorkspacePatch): Promise<MyWorkspace | null> {
    return this.database.withTenant({ userId, workspaceId }, async (tx) => {
      const updated = await tx
        .update(workspaces)
        .set(patch)
        .where(eq(workspaces.id, workspaceId))
        .returning({ id: workspaces.id });
      if (updated.length === 0) return null;

      const [row] = await selectMine(tx, userId).where(eq(workspaces.id, workspaceId));
      return row ? toMyWorkspace(row) : null;
    });
  }

  /** `false` when nothing was deleted (no such workspace, or `workspace:delete` is missing). */
  remove(userId: string, workspaceId: string): Promise<boolean> {
    return this.database.withTenant({ userId, workspaceId }, async (tx) => {
      const deleted = await tx
        .delete(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .returning({ id: workspaces.id });
      return deleted.length > 0;
    });
  }

  /** Asks the database, because row level security hides other people's workspaces from the caller. */
  isSlugAvailable(userId: string, slug: string): Promise<boolean> {
    return this.database.withTenant({ userId }, async (tx) => {
      const { rows } = await tx.execute<{ available: boolean }>(
        sql`SELECT app.workspace_slug_available(${slug}) AS available`,
      );
      return rows[0]?.available === true;
    });
  }
}
