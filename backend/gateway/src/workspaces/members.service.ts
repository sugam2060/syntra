import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionService } from '../authorization/permission.service';
import type { PermissionKey } from '../database/schemas/workspace/permission-keys';
import type { ChangeMemberRoleDto, ReplacePermissionOverridesDto } from './dto';
import { MembersRepository } from './members.repository';
import { RolesRepository } from './roles.repository';
import type { MemberSummary, PermissionOverride } from './types';

const OWNER_PROTECTED_MESSAGE =
  'The workspace owner cannot be changed, removed or leave. Ownership transfer is not available yet';

/**
 * Member management. The database already protects the owner row; the checks here turn those
 * silent no-ops into clear errors and add the escalation rule: nobody can hand out a role or an
 * allow-override that carries a permission they do not hold themselves.
 */
@Injectable()
export class MembersService {
  constructor(
    private readonly members: MembersRepository,
    private readonly roles: RolesRepository,
    private readonly permissionService: PermissionService,
  ) {}

  list(userId: string, workspaceId: string): Promise<MemberSummary[]> {
    return this.members.list({ userId, workspaceId });
  }

  /**
   * @throws NotFoundException unknown role or member
   * @throws ForbiddenException the owner role, the owner as target, or a role above the caller
   */
  async changeRole(
    actorId: string,
    workspaceId: string,
    targetUserId: string,
    dto: ChangeMemberRoleDto,
  ): Promise<MemberSummary> {
    this.assertNotSelf(actorId, targetUserId, 'role');
    const ctx = { userId: actorId, workspaceId };

    const role = await this.roles.find(ctx, dto.roleId);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem && role.key === 'owner') {
      throw new ForbiddenException('The owner role cannot be assigned');
    }

    await this.requireChangeableMember(ctx, targetUserId);
    if (!(await this.permissionService.hasAll(actorId, workspaceId, role.permissions))) {
      throw new ForbiddenException('You cannot assign a role with permissions you do not hold');
    }

    if (!(await this.members.changeRole(ctx, targetUserId, role.id))) {
      throw new NotFoundException('Member not found');
    }
    return this.requireMember(ctx, targetUserId);
  }

  /**
   * @throws NotFoundException unknown member
   * @throws ForbiddenException the target is the owner
   */
  async remove(actorId: string, workspaceId: string, targetUserId: string): Promise<void> {
    const ctx = { userId: actorId, workspaceId };
    await this.requireChangeableMember(ctx, targetUserId);

    if (!(await this.members.remove(ctx, targetUserId))) {
      throw new NotFoundException('Member not found');
    }
  }

  /**
   * The caller leaves the workspace.
   * @throws ForbiddenException the caller is the owner
   */
  async leave(userId: string, workspaceId: string): Promise<void> {
    await this.remove(userId, workspaceId, userId);
  }

  async listOverrides(
    actorId: string,
    workspaceId: string,
    targetUserId: string,
  ): Promise<PermissionOverride[]> {
    const ctx = { userId: actorId, workspaceId };
    await this.requireMember(ctx, targetUserId);
    return this.members.listOverrides(ctx, targetUserId);
  }

  /**
   * Replaces every override of the member. Anything that gives the member a permission counts as
   * a grant and needs the caller to hold it: an `allow`, and also the removal or reversal of an
   * existing `deny`, because lifting a deny hands the permission back. Adding or keeping a deny
   * is always safe.
   * @throws BadRequestException a permission appears twice
   * @throws ForbiddenException the target is the caller or the owner, or the caller lacks a
   *   permission the new set would give the member
   * @throws NotFoundException unknown member
   */
  async replaceOverrides(
    actorId: string,
    workspaceId: string,
    targetUserId: string,
    dto: ReplacePermissionOverridesDto,
  ): Promise<PermissionOverride[]> {
    this.assertNotSelf(actorId, targetUserId, 'permission overrides');
    const ctx = { userId: actorId, workspaceId };
    const keys = dto.overrides.map((override) => override.permissionKey);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Each permission may appear only once');
    }

    await this.requireChangeableMember(ctx, targetUserId);

    const kept = new Set(
      dto.overrides
        .filter((override) => override.effect === 'deny')
        .map((override) => override.permissionKey),
    );
    const lifted = (await this.members.listOverrides(ctx, targetUserId))
      .filter((current) => current.effect === 'deny' && !kept.has(current.permissionKey))
      .map((current) => current.permissionKey);
    const granted = dto.overrides
      .filter((override) => override.effect === 'allow')
      .map((override) => override.permissionKey);

    if (!(await this.permissionService.hasAll(actorId, workspaceId, [...granted, ...lifted]))) {
      throw new ForbiddenException('You cannot grant permissions you do not hold yourself');
    }

    return this.members.replaceOverrides(ctx, targetUserId, dto.overrides);
  }

  /**
   * Removing a `deny` gives the permission back, so it needs the same check as granting it.
   * @throws ForbiddenException the target is the caller or the owner, or the caller lacks the
   *   permission whose deny is being lifted
   * @throws NotFoundException unknown member, or the member has no override for the permission
   */
  async removeOverride(
    actorId: string,
    workspaceId: string,
    targetUserId: string,
    permissionKey: PermissionKey,
  ): Promise<void> {
    this.assertNotSelf(actorId, targetUserId, 'permission overrides');
    const ctx = { userId: actorId, workspaceId };
    await this.requireChangeableMember(ctx, targetUserId);

    const current = (await this.members.listOverrides(ctx, targetUserId)).find(
      (override) => override.permissionKey === permissionKey,
    );
    if (
      current?.effect === 'deny' &&
      !(await this.permissionService.hasAll(actorId, workspaceId, [permissionKey]))
    ) {
      throw new ForbiddenException('You cannot lift a restriction on a permission you do not hold');
    }

    if (!(await this.members.removeOverride(ctx, targetUserId, permissionKey))) {
      throw new NotFoundException('Override not found');
    }
  }

  /**
   * Nobody edits their own role or overrides. Otherwise the holder of `member:update_role` could
   * clear a deny that someone else set on them and so undo the restriction.
   */
  private assertNotSelf(actorId: string, targetUserId: string, what: string): void {
    if (actorId === targetUserId) {
      throw new ForbiddenException(`You cannot change your own ${what}`);
    }
  }

  private async requireMember(
    ctx: { userId: string; workspaceId: string },
    targetUserId: string,
  ): Promise<MemberSummary> {
    const member = await this.members.find(ctx, targetUserId);
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  private async requireChangeableMember(
    ctx: { userId: string; workspaceId: string },
    targetUserId: string,
  ): Promise<MemberSummary> {
    const member = await this.requireMember(ctx, targetUserId);
    if (member.isOwner) throw new ForbiddenException(OWNER_PROTECTED_MESSAGE);
    return member;
  }
}
