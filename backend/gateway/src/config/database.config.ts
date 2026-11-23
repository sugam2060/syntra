import { registerAs } from '@nestjs/config';
import type { DatabaseConfig } from './types';

export const DATABASE_CONFIG_KEY = 'database';

export default registerAs(
  DATABASE_CONFIG_KEY,
  (): DatabaseConfig => ({
    url: process.env.DATABASE_URL as string,
    ssl: process.env.DB_SSL === 'true',
    applicationName: process.env.DB_APPLICATION_NAME ?? 'syntra-gateway',
    pool: {
      max: Number(process.env.DB_POOL_MAX ?? 10),
      min: Number(process.env.DB_POOL_MIN ?? 2),
      idleTimeoutMs: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? 30_000),
      connectionTimeoutMs: Number(
        process.env.DB_POOL_CONNECTION_TIMEOUT_MS ?? 5_000,
      ),
      maxLifetimeSeconds: Number(
        process.env.DB_POOL_MAX_LIFETIME_SECONDS ?? 1_800,
      ),
    },
    statementTimeoutMs: Number(process.env.DB_STATEMENT_TIMEOUT_MS ?? 30_000),
    idleInTransactionTimeoutMs: Number(
      process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS ?? 15_000,
    ),
  }),
);
