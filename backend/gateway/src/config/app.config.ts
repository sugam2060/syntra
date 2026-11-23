import { registerAs } from '@nestjs/config';
import type { AppConfig } from './types';

export const APP_CONFIG_KEY = 'app';

export const DEFAULT_API_PREFIX = 'api/v1';

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, '');

export default registerAs(
  APP_CONFIG_KEY,
  (): AppConfig => ({
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: trimSlashes(process.env.API_PREFIX ?? DEFAULT_API_PREFIX),
    frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(
      /\/+$/,
      '',
    ),
    isProduction: process.env.NODE_ENV === 'production',
    throttle: {
      ttlMs: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
      limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      authLimit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 10),
    },
  }),
);
