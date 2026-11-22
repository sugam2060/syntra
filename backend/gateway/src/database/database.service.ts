import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { DRIZZLE, PG_POOL } from './database.constants';
import type {
  AppDatabase,
  PoolStats,
  TenantContext,
  TenantTransaction,
} from './database.types';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @Inject(DRIZZLE) private readonly database: AppDatabase,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  /**
   * Unscoped access. No tenant context is set, so RLS denies everything on tenant tables.
   * Use it only for context-free queries; prefer {@link withTenant}.
   */
  get db(): AppDatabase {
    return this.database;
  }

  async onModuleInit(): Promise<void> {
    await this.pool.query('SELECT 1');
    this.logger.log('Database connection established');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
    this.logger.log('Database pool closed');
  }

  /**
   * Runs `fn` in a transaction with the RLS context (`app.user_id`, `app.workspace_id`) set via
   * transaction-local settings, so values never leak to other requests sharing the pooled connection.
   */
  async withTenant<T>(
    context: TenantContext,
    fn: (tx: TenantTransaction) => Promise<T>,
  ): Promise<T> {
    this.assertUuid(context.userId, 'userId');
    if (context.workspaceId !== undefined) {
      this.assertUuid(context.workspaceId, 'workspaceId');
    }

    return this.database.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.user_id', ${context.userId}, true),
                   set_config('app.workspace_id', ${context.workspaceId ?? ''}, true)`,
      );
      return fn(tx);
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  getPoolStats(): PoolStats {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  private assertUuid(value: string, field: string): void {
    if (!UUID_PATTERN.test(value)) {
      throw new TypeError(`Invalid tenant context: ${field} must be a UUID`);
    }
  }
}
