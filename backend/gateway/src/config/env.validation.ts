import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

const URL_OPTIONS = { require_tld: false, require_protocol: true } as const;

export class EnvironmentVariables {
  // --- App -----------------------------------------------------------------
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @Matches(/^[A-Za-z0-9/_-]+$/, {
    message: 'API_PREFIX may only contain letters, digits, "/", "_" and "-"',
  })
  API_PREFIX: string = 'api/v1';

  @IsUrl(URL_OPTIONS)
  FRONTEND_URL: string = 'http://localhost:3001';

  /** `false` (default), `true`, or the number of proxy hops in front of the app, e.g. `1`. */
  @Matches(/^(true|false|\d+)$/, {
    message: 'TRUST_PROXY must be true, false or a hop count such as 1',
  })
  TRUST_PROXY: string = 'false';

  /** Five-field cron pattern for the nightly purge of expired sessions, tokens and keys. */
  @Matches(/^(\S+\s+){4}\S+$/, {
    message: 'AUTH_CLEANUP_CRON must be a five-field cron pattern',
  })
  AUTH_CLEANUP_CRON: string = '0 3 * * *';

  @IsInt()
  @Min(1)
  THROTTLE_TTL_MS: number = 60_000;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 120;

  @IsInt()
  @Min(1)
  AUTH_THROTTLE_LIMIT: number = 10;

  // --- Database ------------------------------------------------------------
  @IsString()
  DATABASE_URL!: string;

  @IsOptional()
  @IsString()
  DATABASE_MIGRATION_URL?: string;

  @IsOptional()
  @IsString()
  APP_DB_PASSWORD?: string;

  @IsInt()
  @Min(1)
  DB_POOL_MAX: number = 10;

  @IsInt()
  @Min(0)
  DB_POOL_MIN: number = 2;

  @IsInt()
  @Min(0)
  DB_POOL_IDLE_TIMEOUT_MS: number = 30_000;

  @IsInt()
  @Min(0)
  DB_POOL_CONNECTION_TIMEOUT_MS: number = 5_000;

  @IsInt()
  @Min(0)
  DB_POOL_MAX_LIFETIME_SECONDS: number = 1_800;

  @IsInt()
  @Min(0)
  DB_STATEMENT_TIMEOUT_MS: number = 30_000;

  @IsInt()
  @Min(0)
  DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: number = 15_000;

  @IsIn(['true', 'false'])
  DB_SSL: string = 'false';

  @IsString()
  DB_APPLICATION_NAME: string = 'syntra-gateway';

  // --- Redis (BullMQ) ------------------------------------------------------
  @IsString()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsInt()
  @Min(0)
  @Max(15)
  REDIS_DB: number = 0;

  // --- Authentication ------------------------------------------------------
  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET!: string;

  @Matches(/^\d+(ms|s|m|h|d)$/, {
    message: 'JWT_ACCESS_TTL must look like 15m, 1h or 900s',
  })
  JWT_ACCESS_TTL: string = '15m';

  @IsString()
  JWT_ISSUER: string = 'syntra-gateway';

  @IsString()
  JWT_AUDIENCE: string = 'syntra-api';

  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 30;

  @IsInt()
  @Min(1)
  EMAIL_VERIFICATION_TTL_HOURS: number = 24;

  @IsInt()
  @Min(1)
  PASSWORD_RESET_TTL_MINUTES: number = 30;

  @IsInt()
  @Min(1)
  INVITATION_TTL_DAYS: number = 7;

  @IsString()
  @MinLength(1)
  GOOGLE_CLIENT_ID!: string;

  @IsString()
  @MinLength(1)
  GOOGLE_CLIENT_SECRET!: string;

  @IsUrl(URL_OPTIONS)
  GOOGLE_CALLBACK_URL: string =
    'http://localhost:3000/api/v1/authentication/callback/google';

  // --- Mail ----------------------------------------------------------------
  @IsString()
  SMTP_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 1025;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASSWORD?: string;

  @IsString()
  MAIL_FROM: string = 'Syntra <no-reply@syntra.local>';
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return validated;
}
