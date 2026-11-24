import { IsUUID } from 'class-validator';

/** Body of `PATCH workspaces/:workspaceId/members/:userId`. */
export class ChangeMemberRoleDto {
  /** A system role or a custom role of this workspace. The owner role cannot be assigned. */
  @IsUUID()
  roleId!: string;
}
