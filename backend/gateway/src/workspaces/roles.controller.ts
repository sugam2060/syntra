import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Permission, RequiredPermission, WorkspaceId } from '../authorization';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NoApiKey } from '../common/decorators/no-api-key.decorator';
import type { AuthenticatedUser } from '../common/types';
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { RolesService } from './roles.service';
import type { PermissionInfo, RoleSummary } from './types';

/**
 * Roles and the permission catalogue of a workspace. Reading needs `workspace:read` (an API key
 * may do it); changing custom roles needs `member:update_role` and a signed-in user.
 */
@Controller('workspaces/:workspaceId')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** System roles plus this workspace's custom roles, each with its permission keys. */
  @Get('roles')
  @RequiredPermission(Permission.WORKSPACE_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
  ): Promise<RoleSummary[]> {
    return this.roles.list(user.userId, workspaceId);
  }

  /** Every permission a role or override can contain, for building the editor. */
  @Get('permissions')
  @RequiredPermission(Permission.WORKSPACE_READ)
  listPermissions(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
  ): Promise<PermissionInfo[]> {
    return this.roles.listPermissions(user.userId, workspaceId);
  }

  @Post('roles')
  @NoApiKey()
  @RequiredPermission(Permission.MEMBER_UPDATE_ROLE)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateRoleDto,
  ): Promise<RoleSummary> {
    return this.roles.create(user.userId, workspaceId, dto);
  }

  @Patch('roles/:roleId')
  @NoApiKey()
  @RequiredPermission(Permission.MEMBER_UPDATE_ROLE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleSummary> {
    return this.roles.update(user.userId, workspaceId, roleId, dto);
  }

  @Delete('roles/:roleId')
  @NoApiKey()
  @RequiredPermission(Permission.MEMBER_UPDATE_ROLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ): Promise<void> {
    return this.roles.remove(user.userId, workspaceId, roleId);
  }
}
