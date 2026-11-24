import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Permission, RequiredPermission, WorkspaceId } from '../authorization';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NoApiKey } from '../common/decorators/no-api-key.decorator';
import { StrictThrottle } from '../common/decorators/strict-throttle.decorator';
import type { AuthenticatedUser } from '../common/types';
import { InviteMembersDto } from './dto';
import { InvitationsService } from './invitations.service';
import type { InvitationSummary, InviteResult } from './types';

/**
 * Inviting people to a workspace. Needs `member:invite` and a signed-in user: an API key must not
 * be able to send email or read the addresses of pending invitations.
 */
@Controller('workspaces/:workspaceId/invitations')
@NoApiKey()
@RequiredPermission(Permission.MEMBER_INVITE)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  /** One result per address: `invited`, `already_member` or `already_invited`. */
  @Post()
  @StrictThrottle()
  invite(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Body() dto: InviteMembersDto,
  ): Promise<InviteResult[]> {
    return this.invitations.invite(user.userId, workspaceId, dto);
  }

  /** Open invitations, expired ones included so they can be resent or revoked. */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
  ): Promise<InvitationSummary[]> {
    return this.invitations.list(user.userId, workspaceId);
  }

  /** New token and expiry; the previously emailed link stops working. */
  @Post(':invitationId/resend')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  resend(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<InvitationSummary> {
    return this.invitations.resend(user.userId, workspaceId, invitationId);
  }

  @Delete(':invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    return this.invitations.revoke(user.userId, workspaceId, invitationId);
  }
}
