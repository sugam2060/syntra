import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { EMAIL_NOT_VERIFIED } from '../authentication/authentication.service';
import { PermissionService } from '../authorization/permission.service';
import { generateOpaqueToken, hashToken } from '../common/utils/opaque-token.util';
import { isUniqueViolation } from '../common/utils/postgres-error.util';
import appConfig from '../config/app.config';
import workspaceConfig from '../config/workspace.config';
import { EmailProducer } from '../jobs/email/email.producer';
import type { AcceptInvitationDto, InviteMembersDto } from './dto';
import { InvitationsRepository } from './invitations.repository';
import { MembersRepository } from './members.repository';
import { RolesRepository } from './roles.repository';
import type {
  AcceptedInvitation,
  InvitationPreview,
  InvitationSummary,
  InviteResult,
  MyInvitation,
  RoleSummary,
} from './types';
import { WorkspacesRepository } from './workspaces.repository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface InvitationEmailContext {
  workspaceName: string;
  inviterName: string | null;
  roleName: string;
  message: string | null;
}

/**
 * Invitations by email. The emailed token is random and only its SHA-256 is stored, so a leaked
 * database row cannot be turned back into an accept link. Whether a person may accept is decided
 * in SQL (`app.accept_workspace_invitation`): it needs a verified email that matches the
 * invitation, and it is single-use even under concurrent requests.
 */
@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly invitations: InvitationsRepository,
    private readonly roles: RolesRepository,
    private readonly members: MembersRepository,
    private readonly workspaces: WorkspacesRepository,
    private readonly permissionService: PermissionService,
    private readonly emails: EmailProducer,
    @Inject(workspaceConfig.KEY) private readonly config: ConfigType<typeof workspaceConfig>,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) {}

  /**
   * Invites every address, one by one, and reports what happened to each. A problem with one
   * address never blocks the others.
   * @throws NotFoundException unknown role or workspace
   * @throws ForbiddenException the owner role, or a role with permissions the caller lacks
   */
  async invite(
    actorId: string,
    workspaceId: string,
    dto: InviteMembersDto,
  ): Promise<InviteResult[]> {
    const ctx = { userId: actorId, workspaceId };

    const role = await this.requireAssignableRole(ctx, dto.roleId);
    const workspace = await this.workspaces.findById(actorId, workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    const inviter = await this.members.find(ctx, actorId);

    const context: InvitationEmailContext = {
      workspaceName: workspace.name,
      inviterName: inviter?.name ?? null,
      roleName: role.name,
      message: dto.message ?? null,
    };

    const emails = [...new Set(dto.emails.map((email) => email.trim().toLowerCase()))];
    const results: InviteResult[] = [];
    for (const email of emails) {
      results.push(await this.inviteOne(ctx, email, role.id, context));
    }
    return results;
  }

  list(actorId: string, workspaceId: string): Promise<InvitationSummary[]> {
    return this.invitations.list({ userId: actorId, workspaceId });
  }

  /**
   * Issues a fresh token and expiry and emails the new link. The previous link stops working.
   * @throws NotFoundException the invitation is gone, accepted or revoked
   */
  async resend(
    actorId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<InvitationSummary> {
    const ctx = { userId: actorId, workspaceId };
    const existing = await this.invitations.find(ctx, invitationId);
    if (!existing) throw new NotFoundException('Invitation not found');

    const workspace = await this.workspaces.findById(actorId, workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    const inviter = await this.members.find(ctx, actorId);

    const { token, hash } = generateOpaqueToken();
    const rotated = await this.invitations.rotate(ctx, invitationId, hash, this.expiry());
    if (!rotated) throw new NotFoundException('Invitation not found');

    await this.sendEmail(rotated.email, token, rotated.expiresAt, {
      workspaceName: workspace.name,
      inviterName: inviter?.name ?? null,
      roleName: rotated.role.name,
      message: null,
    });
    return rotated;
  }

  /** @throws NotFoundException the invitation is gone, accepted or already revoked */
  async revoke(actorId: string, workspaceId: string, invitationId: string): Promise<void> {
    if (!(await this.invitations.revoke({ userId: actorId, workspaceId }, invitationId))) {
      throw new NotFoundException('Invitation not found');
    }
  }

  listMine(userId: string): Promise<MyInvitation[]> {
    return this.invitations.listMine(userId);
  }

  /** @throws NotFoundException unknown token */
  async preview(token: string): Promise<InvitationPreview> {
    const preview = await this.invitations.preview(hashToken(token));
    if (!preview) throw new NotFoundException('Invitation not found');
    return preview;
  }

  /**
   * @throws BadRequestException neither or both of token and invitationId, or the invitation is
   *   unknown, expired, revoked, already used or addressed to somebody else (one message for all,
   *   so it cannot be used to probe invitations)
   * @throws ForbiddenException (`error: EMAIL_NOT_VERIFIED`) the caller has not verified their email
   */
  async accept(userId: string, dto: AcceptInvitationDto): Promise<AcceptedInvitation> {
    if ((dto.token === undefined) === (dto.invitationId === undefined)) {
      throw new BadRequestException('Provide either token or invitationId');
    }
    const reference =
      dto.token !== undefined
        ? { tokenHash: hashToken(dto.token) }
        : { invitationId: dto.invitationId as string };

    const outcome = await this.invitations.accept(userId, reference);
    switch (outcome.status) {
      case 'accepted':
        return { workspaceId: outcome.workspaceId };
      case 'email-not-verified':
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Verify your email address before accepting an invitation',
          error: EMAIL_NOT_VERIFIED,
        });
      case 'invalid':
        throw new BadRequestException('Invalid or expired invitation');
    }
  }

  /** @throws NotFoundException the invitation is not addressed to the caller or is already closed */
  async decline(userId: string, invitationId: string): Promise<void> {
    if (!(await this.invitations.decline(userId, invitationId))) {
      throw new NotFoundException('Invitation not found');
    }
  }

  private async inviteOne(
    ctx: { userId: string; workspaceId: string },
    email: string,
    roleId: string,
    context: InvitationEmailContext,
  ): Promise<InviteResult> {
    if (await this.invitations.isMemberEmail(ctx, email)) {
      return { email, outcome: 'already_member', invitation: null };
    }

    // An expired invitation still occupies the "one pending invitation per address" slot until
    // it is revoked, so it is replaced rather than reported as a duplicate.
    const pending = await this.invitations.findPendingByEmail(ctx, email);
    if (pending) {
      if (pending.expiresAt.getTime() > Date.now()) {
        return { email, outcome: 'already_invited', invitation: null };
      }
      await this.invitations.revoke(ctx, pending.id);
    }

    const { token, hash } = generateOpaqueToken();
    let invitation: InvitationSummary;
    try {
      invitation = await this.invitations.insert(ctx, {
        email,
        roleId,
        tokenHash: hash,
        expiresAt: this.expiry(),
      });
    } catch (error) {
      // Another request invited the same address between the check and the insert.
      if (isUniqueViolation(error)) return { email, outcome: 'already_invited', invitation: null };
      throw error;
    }

    await this.sendEmail(email, token, invitation.expiresAt, context);
    return { email, outcome: 'invited', invitation };
  }

  private async requireAssignableRole(
    ctx: { userId: string; workspaceId: string },
    roleId: string,
  ): Promise<RoleSummary> {
    const role = await this.roles.find(ctx, roleId);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem && role.key === 'owner') {
      throw new ForbiddenException('The owner role cannot be offered in an invitation');
    }
    if (!(await this.permissionService.hasAll(ctx.userId, ctx.workspaceId, role.permissions))) {
      throw new ForbiddenException('You cannot invite someone with permissions you do not hold');
    }
    return role;
  }

  /** The invitation exists either way; a mail failure is logged and can be fixed with a resend. */
  private async sendEmail(
    email: string,
    token: string,
    expiresAt: Date,
    context: InvitationEmailContext,
  ): Promise<void> {
    try {
      await this.emails.sendWorkspaceInvitation({
        email,
        name: null,
        link: `${this.app.frontendUrl}/invitations/accept?token=${token}`,
        workspaceName: context.workspaceName,
        inviterName: context.inviterName,
        roleName: context.roleName,
        message: context.message,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Could not queue invitation email: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private expiry(): Date {
    return new Date(Date.now() + this.config.invitationTtlDays * MS_PER_DAY);
  }
}
