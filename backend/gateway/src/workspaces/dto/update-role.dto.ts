import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from '../../database/schemas/workspace/permission-keys';

/** Body of `PATCH workspaces/:workspaceId/roles/:roleId`. At least one field is required. */
export class UpdateRoleDto {
  /** Changes the display name only. The role key never changes, so references stay stable. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  /** Replaces the whole permission set. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(PERMISSION_KEYS.length)
  @IsIn(PERMISSION_KEYS, { each: true })
  permissions?: PermissionKey[];
}
