import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Put,
} from '@nestjs/common';
import { Permission, RequiredPermission, WorkspaceId } from '../authorization';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NoApiKey } from '../common/decorators/no-api-key.decorator';
import type { AuthenticatedUser } from '../common/types';
import type { PermissionKey } from '../database/schemas/workspace/permission-keys';
import { ChangeMemberRoleDto, ReplacePermissionOverridesDto } from './dto';
import { MembersService } from './members.service';
import type { MemberSummary, PermissionOverride } from './types';

/** Parses a path segment into a known permission code, 400 otherwise. */
const PermissionKeyPipe = new ParseEnumPipe(Permission);

/**
 * Members of a workspace and their per-member permission overrides. Listing needs
 * `workspace:read` (an API key may do it); everything that changes membership is limited to
 * signed-in users.
 *
 * Declaration order matters: `members/me` comes before `members/:userId` so `me` is not parsed
 * as a user id.
 */
@Controller('workspaces/:workspaceId/members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @RequiredPermission(Permission.WORKSPACE_READ)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
  ): Promise<MemberSummary[]> {
    return this.members.list(user.userId, workspaceId);
  }

  /** The caller leaves the workspace. The owner cannot. */
  @Delete('me')
  @NoApiKey()
  @RequiredPermission(Permission.WORKSPACE_READ)
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
  ): Promise<void> {
    return this.members.leave(user.userId, workspaceId);
  }

  @Patch(':userId')
  @NoApiKey()
  @RequiredPermission(Permission.MEMBER_UPDATE_ROLE)
  changeRole(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ChangeMemberRoleDto,
  ): Promise<MemberSummary> {
    return this.members.changeRole(user.userId, workspaceId, userId, dto);
  }

  @Delete(':userId')
  @NoApiKey()
  @RequiredPermission(Permission.MEMBER_REMOVE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.members.remove(user.userId, workspaceId, userId);
  }

  @Get(':userId/permission-overrides')
  @NoApiKey()
  @RequiredPermission(Permission.MEMBER_UPDATE_ROLE)
  listOverrides(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<PermissionOverride[]> {
    return this.members.listOverrides(user.userId, workspaceId, userId);
  }

  /** Replaces the whole set. Send an empty array to clear every override. */
  @Put(':userId/permission-overrides')
  @NoApiKey()
  @RequiredPermission(Permission.MEMBER_UPDATE_ROLE)
  replaceOverrides(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ReplacePermissionOverridesDto,
  ): Promise<PermissionOverride[]> {
    return this.members.replaceOverrides(user.userId, workspaceId, userId, dto);
  }

  @Delete(':userId/permission-overrides/:permissionKey')
  @NoApiKey()
  @RequiredPermission(Permission.MEMBER_UPDATE_ROLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeOverride(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('permissionKey', PermissionKeyPipe) permissionKey: PermissionKey,
  ): Promise<void> {
    return this.members.removeOverride(user.userId, workspaceId, userId, permissionKey);
  }
}
