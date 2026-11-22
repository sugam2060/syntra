import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgDatabase, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import * as schema from './schemas';

export type DatabaseSchema = typeof schema;

/** Drizzle instance without the raw pool escape hatch (`$client`). */
export type AppDatabase = Omit<NodePgDatabase<DatabaseSchema>, '$client'>;

export type TenantTransaction = PgTransaction<
  NodePgQueryResultHKT,
  DatabaseSchema,
  ExtractTablesWithRelations<DatabaseSchema>
>;

export interface TenantContext {
  userId: string;
  workspaceId?: string;
}

export interface PoolStats {
  total: number;
  idle: number;
  waiting: number;
}
