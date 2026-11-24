import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, ValidateNested } from 'class-validator';
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from '../../database/schemas/workspace/permission-keys';
import type { PermissionEffect } from '../types';

const EFFECTS: readonly PermissionEffect[] = ['allow', 'deny'];

/** One allow or deny exception for a single permission. */
export class PermissionOverrideDto {
  @IsIn(PERMISSION_KEYS)
  permissionKey!: PermissionKey;

  @IsIn(EFFECTS)
  effect!: PermissionEffect;
}

/** Body of `PUT workspaces/:workspaceId/members/:userId/permission-overrides`. */
export class ReplacePermissionOverridesDto {
  /** The complete new set. An empty array removes every override of the member. */
  @IsArray()
  @ArrayMaxSize(PERMISSION_KEYS.length)
  @ValidateNested({ each: true })
  @Type(() => PermissionOverrideDto)
  overrides!: PermissionOverrideDto[];
}
