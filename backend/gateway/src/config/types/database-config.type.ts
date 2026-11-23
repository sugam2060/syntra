export interface DatabaseConfig {
  url: string;
  ssl: boolean;
  applicationName: string;
  pool: {
    max: number;
    min: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
    maxLifetimeSeconds: number;
  };
  statementTimeoutMs: number;
  idleInTransactionTimeoutMs: number;
}
