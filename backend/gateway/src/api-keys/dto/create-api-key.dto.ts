import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from '../../database/schemas/workspace/permission-keys';

/** Body of `POST workspaces/:workspaceId/api-keys`. */
export class CreateApiKeyDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  /** What the key may do. The creator must hold every code themselves (checked in the service). */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(PERMISSION_KEYS.length)
  @IsIn(PERMISSION_KEYS, { each: true })
  permissions!: PermissionKey[];

  /** ISO 8601 timestamp in the future. Omit for a key that never expires. */
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
