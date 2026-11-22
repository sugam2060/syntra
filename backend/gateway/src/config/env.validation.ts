import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
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
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return validated;
}
