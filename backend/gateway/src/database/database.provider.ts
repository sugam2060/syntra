import { Logger, Provider } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import databaseConfig from '../config/database.config';
import { DRIZZLE, PG_POOL } from './database.constants';
import type { AppDatabase } from './database.types';
import * as schema from './schemas';

const logger = new Logger('DatabasePool');

export const databaseProviders: Provider[] = [
  {
    provide: PG_POOL,
    inject: [databaseConfig.KEY],
    useFactory: (config: ConfigType<typeof databaseConfig>): Pool => {
      const pool = new Pool({
        connectionString: config.url,
        // `true` keeps certificate verification on; trust a private CA via NODE_EXTRA_CA_CERTS.
        ssl: config.ssl ? true : undefined,
        max: config.pool.max,
        min: config.pool.min,
        idleTimeoutMillis: config.pool.idleTimeoutMs,
        connectionTimeoutMillis: config.pool.connectionTimeoutMs,
        maxLifetimeSeconds: config.pool.maxLifetimeSeconds,
        allowExitOnIdle: false,
        application_name: config.applicationName,
        statement_timeout: config.statementTimeoutMs,
        idle_in_transaction_session_timeout: config.idleInTransactionTimeoutMs,
      });

      // An error on an idle client must never crash the process.
      pool.on('error', (error) => {
        logger.error(`Unexpected error on idle client: ${error.message}`);
      });

      return pool;
    },
  },
  {
    provide: DRIZZLE,
    inject: [PG_POOL],
    useFactory: (pool: Pool): AppDatabase =>
      drizzle({ client: pool, schema, casing: 'snake_case' }),
  },
];
