import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NoApiKey } from '../common/decorators/no-api-key.decorator';
import { Public } from '../common/decorators/public.decorator';
import { StrictThrottle } from '../common/decorators/strict-throttle.decorator';
import type { AuthenticatedUser } from '../common/types';
import { AcceptInvitationDto, PreviewInvitationQueryDto } from './dto';
import { InvitationsService } from './invitations.service';
import type { AcceptedInvitation, InvitationPreview, MyInvitation } from './types';

/**
 * The invitee's side. These routes have no `:workspaceId` because the caller is not a member yet;
 * what they may do is decided in SQL from their verified email. None of them accepts an API key.
 */
@Controller('invitations')
@NoApiKey()
export class MyInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  /** Live invitations addressed to the caller's verified email. */
  @Get('mine')
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<MyInvitation[]> {
    return this.invitations.listMine(user.userId);
  }

  /**
   * What the accept page shows for an emailed token. Public so it works before sign-in; the token
   * is the secret, so it is throttled like the auth routes.
   */
  @Public()
  @Get('preview')
  @StrictThrottle()
  preview(@Query() query: PreviewInvitationQueryDto): Promise<InvitationPreview> {
    return this.invitations.preview(query.token);
  }

  /** Accepts by emailed `token` or by `invitationId` from the in-app list. */
  @Post('accept')
  @StrictThrottle()
  @HttpCode(HttpStatus.OK)
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptInvitationDto,
  ): Promise<AcceptedInvitation> {
    return this.invitations.accept(user.userId, dto);
  }

  @Post(':invitationId/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<void> {
    return this.invitations.decline(user.userId, invitationId);
  }
}
