import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from '../../database/schemas/workspace/permission-keys';

/** Body of `POST workspaces/:workspaceId/roles`. */
export class CreateRoleDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  /** What the role grants. The caller must hold every code themselves (checked in the service). */
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(PERMISSION_KEYS.length)
  @IsIn(PERMISSION_KEYS, { each: true })
  permissions!: PermissionKey[];
}
