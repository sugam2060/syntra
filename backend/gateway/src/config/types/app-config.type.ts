export interface AppConfig {
  port: number;
  /** Global route prefix without leading or trailing slash, e.g. `api/v1`. */
  apiPrefix: string;
  /** Origin of the web client; used for CORS and email/OAuth redirects. */
  frontendUrl: string;
  isProduction: boolean;
  /** Express `trust proxy` setting; see `parseTrustProxy`. */
  trustProxy: boolean | number;
  maintenance: {
    /** Cron pattern (5 fields) of the nightly expired-data purge. */
    authCleanupCron: string;
  };
  throttle: {
    ttlMs: number;
    limit: number;
    authLimit: number;
  };
}
