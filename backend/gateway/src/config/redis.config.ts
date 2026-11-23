import { registerAs } from '@nestjs/config';
import type { RedisConfig } from './types';

export const REDIS_CONFIG_KEY = 'redis';

export default registerAs(
  REDIS_CONFIG_KEY,
  (): RedisConfig => ({
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    db: Number(process.env.REDIS_DB ?? 0),
  }),
);
