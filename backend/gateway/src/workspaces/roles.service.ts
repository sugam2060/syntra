import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionService } from '../authorization/permission.service';
import { isUniqueViolation } from '../common/utils/postgres-error.util';
import type { PermissionKey } from '../database/schemas/workspace/permission-keys';
import type { CreateRoleDto, UpdateRoleDto } from './dto';
import { RolesRepository } from './roles.repository';
import { type PermissionInfo, type RoleSummary, SYSTEM_ROLE_KEYS } from './types';
import { roleKeyFromName } from './utils/role-key.util';

const ESCALATION_MESSAGE = 'You cannot grant permissions you do not hold yourself';

/**
 * Custom roles of a workspace. System roles are read-only. A caller can only put permissions in
 * a role that they hold themselves, so a holder of `member:update_role` cannot mint a role that
 * is more powerful than they are and then assign it to themselves.
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly permissionService: PermissionService,
  ) {}

  list(userId: string, workspaceId: string): Promise<RoleSummary[]> {
    return this.roles.list({ userId, workspaceId });
  }

  listPermissions(userId: string, workspaceId: string): Promise<PermissionInfo[]> {
    return this.roles.listPermissions({ userId, workspaceId });
  }

  /**
   * @throws BadRequestException the name yields no usable key
   * @throws ConflictException the key is taken or would shadow a system role
   * @throws ForbiddenException the caller does not hold every permission requested
   */
  async create(userId: string, workspaceId: string, dto: CreateRoleDto): Promise<RoleSummary> {
    const key = roleKeyFromName(dto.name);
    if (!key) throw new BadRequestException('The role name must contain letters or digits');
    if ((SYSTEM_ROLE_KEYS as readonly string[]).includes(key)) {
      throw new ConflictException('That name is reserved for a built-in role');
    }
    await this.assertMayGrant(userId, workspaceId, dto.permissions);

    try {
      return await this.roles.create(
        { userId, workspaceId },
        { key, name: dto.name, permissions: dto.permissions },
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A role with this name already exists');
      }
      throw error;
    }
  }

  /**
   * @throws BadRequestException nothing to change
   * @throws ForbiddenException the role is built in, or the caller lacks a permission it sets
   * @throws NotFoundException no such role in this workspace
   */
  async update(
    userId: string,
    workspaceId: string,
    roleId: string,
    dto: UpdateRoleDto,
  ): Promise<RoleSummary> {
    if (dto.name === undefined && dto.permissions === undefined) {
      throw new BadRequestException('Provide a name or permissions to update');
    }
    const ctx = { userId, workspaceId };
    await this.requireCustomRole(ctx, roleId);
    if (dto.permissions) await this.assertMayGrant(userId, workspaceId, dto.permissions);

    const updated = await this.roles.update(ctx, roleId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.permissions !== undefined && { permissions: dto.permissions }),
    });
    if (!updated) throw new NotFoundException('Role not found');
    return updated;
  }

  /**
   * @throws ForbiddenException the role is built in
   * @throws ConflictException members or pending invitations still use the role
   * @throws NotFoundException no such role in this workspace
   */
  async remove(userId: string, workspaceId: string, roleId: string): Promise<void> {
    const ctx = { userId, workspaceId };
    await this.requireCustomRole(ctx, roleId);

    const outcome = await this.roles.remove(ctx, roleId);
    if (outcome === 'in-use') {
      throw new ConflictException('Reassign the members and invitations using this role first');
    }
    if (outcome === 'missing') throw new NotFoundException('Role not found');
  }

  private async requireCustomRole(
    ctx: { userId: string; workspaceId: string },
    roleId: string,
  ): Promise<RoleSummary> {
    const role = await this.roles.find(ctx, roleId);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ForbiddenException('Built-in roles cannot be changed');
    return role;
  }

  private async assertMayGrant(
    userId: string,
    workspaceId: string,
    permissions: readonly PermissionKey[],
  ): Promise<void> {
    if (!(await this.permissionService.hasAll(userId, workspaceId, permissions))) {
      throw new ForbiddenException(ESCALATION_MESSAGE);
    }
  }
}
