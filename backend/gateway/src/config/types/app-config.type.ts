export interface AppConfig {
  port: number;
  /** Global route prefix without leading or trailing slash, e.g. `api/v1`. */
  apiPrefix: string;
  /** Origin of the web client; used for CORS and email/OAuth redirects. */
  frontendUrl: string;
  isProduction: boolean;
  throttle: {
    ttlMs: number;
    limit: number;
    authLimit: number;
  };
}
