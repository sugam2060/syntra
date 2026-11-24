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
  Query,
} from '@nestjs/common';
import { Permission, RequiredPermission } from '../authorization';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NoApiKey } from '../common/decorators/no-api-key.decorator';
import { StrictThrottle } from '../common/decorators/strict-throttle.decorator';
import type { AuthenticatedUser } from '../common/types';
import { CreateWorkspaceDto, SlugQueryDto, UpdateWorkspaceDto } from './dto';
import type { MyWorkspace, SlugAvailability } from './types';
import { WorkspacesService } from './workspaces.service';

/**
 * Workspace lifecycle. Routes without `:workspaceId` act for the signed-in user and are closed to
 * API keys; the read route may be used with a key that holds `workspace:read`.
 *
 * Declaration order matters: the static `slug-availability` and `by-slug` routes come before the
 * `:workspaceId` routes so they are never parsed as ids.
 */
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  @NoApiKey()
  @StrictThrottle()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<MyWorkspace> {
    return this.workspaces.create(user.userId, dto);
  }

  /** Workspaces the caller belongs to, with the caller's role in each. */
  @Get()
  @NoApiKey()
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<MyWorkspace[]> {
    return this.workspaces.listMine(user.userId);
  }

  @Get('slug-availability')
  @NoApiKey()
  @StrictThrottle()
  checkSlug(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SlugQueryDto,
  ): Promise<SlugAvailability> {
    return this.workspaces.checkSlug(user.userId, query.slug);
  }

  /** Resolves a `/w/:slug` URL to the workspace id the rest of the API uses. */
  @Get('by-slug/:slug')
  @NoApiKey()
  getBySlug(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
  ): Promise<MyWorkspace> {
    return this.workspaces.getBySlug(user.userId, slug.toLowerCase());
  }

  @Get(':workspaceId')
  @RequiredPermission(Permission.WORKSPACE_READ)
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<MyWorkspace> {
    return this.workspaces.getById(user.userId, workspaceId);
  }

  @Patch(':workspaceId')
  @NoApiKey()
  @RequiredPermission(Permission.WORKSPACE_UPDATE)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<MyWorkspace> {
    return this.workspaces.update(user.userId, workspaceId, dto);
  }

  @Delete(':workspaceId')
  @NoApiKey()
  @RequiredPermission(Permission.WORKSPACE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<void> {
    return this.workspaces.remove(user.userId, workspaceId);
  }
}
