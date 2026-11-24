import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PermissionService } from '../../authorization/permission.service';
import { Permission } from '../../database/schemas/workspace/permission-keys';
import type { MembersRepository } from '../members.repository';
import { MembersService } from '../members.service';
import type { RolesRepository } from '../roles.repository';
import type { MemberSummary, RoleSummary } from '../types';

const ACTOR = '0192b1c4-0000-7000-8000-000000000001';
const TARGET = '0192b1c4-0000-7000-8000-000000000002';
const WORKSPACE = '0192b1c4-0000-7000-8000-0000000000aa';
const ROLE = '0192b1c4-0000-7000-8000-0000000000bb';
const CTX = { userId: ACTOR, workspaceId: WORKSPACE };

type MembersMock = { [K in keyof MembersRepository]: jest.Mock };
type RolesMock = { [K in keyof RolesRepository]: jest.Mock };

const member = (over: Partial<MemberSummary> = {}): MemberSummary => ({
  userId: TARGET,
  name: 'Target',
  email: 'target@example.com',
  avatarUrl: null,
  role: { id: ROLE, key: 'member', name: 'Member' },
  isOwner: false,
  joinedAt: new Date('2026-01-01'),
  ...over,
});

const role = (over: Partial<RoleSummary> = {}): RoleSummary => ({
  id: ROLE,
  key: 'admin',
  name: 'Admin',
  isSystem: true,
  permissions: [Permission.TASK_READ, Permission.MEMBER_INVITE],
  ...over,
});

describe('MembersService', () => {
  let members: MembersMock;
  let roles: RolesMock;
  let hasAll: jest.Mock;
  let service: MembersService;

  beforeEach(() => {
    members = {
      list: jest.fn().mockResolvedValue([member()]),
      find: jest.fn().mockResolvedValue(member()),
      changeRole: jest.fn().mockResolvedValue(true),
      remove: jest.fn().mockResolvedValue(true),
      listOverrides: jest.fn().mockResolvedValue([]),
      replaceOverrides: jest.fn(async (_ctx, _user, overrides) => overrides),
      removeOverride: jest.fn().mockResolvedValue(true),
    } as MembersMock;
    roles = { find: jest.fn().mockResolvedValue(role()) } as unknown as RolesMock;
    hasAll = jest.fn().mockResolvedValue(true);
    service = new MembersService(
      members as unknown as MembersRepository,
      roles as unknown as RolesRepository,
      { hasAll } as unknown as PermissionService,
    );
  });

  describe('list', () => {
    it('returns the members of the workspace', async () => {
      await expect(service.list(ACTOR, WORKSPACE)).resolves.toEqual([member()]);
      expect(members.list).toHaveBeenCalledWith(CTX);
    });
  });

  describe('changeRole', () => {
    it('assigns the role and returns the updated member', async () => {
      members.find
        .mockResolvedValueOnce(member())
        .mockResolvedValueOnce(member({ role: { id: ROLE, key: 'admin', name: 'Admin' } }));

      const result = await service.changeRole(ACTOR, WORKSPACE, TARGET, { roleId: ROLE });

      expect(members.changeRole).toHaveBeenCalledWith(CTX, TARGET, ROLE);
      expect(result.role.key).toBe('admin');
    });

    it('checks the caller holds every permission of the role being assigned', async () => {
      await service.changeRole(ACTOR, WORKSPACE, TARGET, { roleId: ROLE });

      expect(hasAll).toHaveBeenCalledWith(ACTOR, WORKSPACE, role().permissions);
    });

    it('blocks privilege escalation: an admin cannot hand out a role above their own', async () => {
      hasAll.mockResolvedValue(false);

      await expect(
        service.changeRole(ACTOR, WORKSPACE, TARGET, { roleId: ROLE }),
      ).rejects.toThrow(ForbiddenException);
      expect(members.changeRole).not.toHaveBeenCalled();
    });

    it('never assigns the owner role', async () => {
      roles.find.mockResolvedValue(role({ key: 'owner', permissions: [] }));

      await expect(
        service.changeRole(ACTOR, WORKSPACE, TARGET, { roleId: ROLE }),
      ).rejects.toThrow(ForbiddenException);
      expect(members.changeRole).not.toHaveBeenCalled();
    });

    it('allows a custom role that happens to be called owner', async () => {
      roles.find.mockResolvedValue(role({ key: 'owner', isSystem: false, permissions: [] }));

      await expect(
        service.changeRole(ACTOR, WORKSPACE, TARGET, { roleId: ROLE }),
      ).resolves.toBeDefined();
    });

    it('refuses to change the owner', async () => {
      members.find.mockResolvedValue(member({ isOwner: true }));

      await expect(
        service.changeRole(ACTOR, WORKSPACE, TARGET, { roleId: ROLE }),
      ).rejects.toThrow(ForbiddenException);
      expect(members.changeRole).not.toHaveBeenCalled();
    });

    it('does not let anyone change their own role', async () => {
      members.find.mockResolvedValue(member({ userId: ACTOR }));

      await expect(
        service.changeRole(ACTOR, WORKSPACE, ACTOR, { roleId: ROLE }),
      ).rejects.toThrow(ForbiddenException);
      expect(members.changeRole).not.toHaveBeenCalled();
    });

    it('is 404 for an unknown role or member', async () => {
      roles.find.mockResolvedValue(null);
      await expect(
        service.changeRole(ACTOR, WORKSPACE, TARGET, { roleId: ROLE }),
      ).rejects.toThrow(NotFoundException);

      roles.find.mockResolvedValue(role());
      members.find.mockResolvedValue(null);
      await expect(
        service.changeRole(ACTOR, WORKSPACE, TARGET, { roleId: ROLE }),
      ).rejects.toThrow(NotFoundException);
    });

    it('is 404 when the update touched no row', async () => {
      members.changeRole.mockResolvedValue(false);

      await expect(
        service.changeRole(ACTOR, WORKSPACE, TARGET, { roleId: ROLE }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes a member', async () => {
      await expect(service.remove(ACTOR, WORKSPACE, TARGET)).resolves.toBeUndefined();
      expect(members.remove).toHaveBeenCalledWith(CTX, TARGET);
    });

    it('refuses to remove the owner', async () => {
      members.find.mockResolvedValue(member({ isOwner: true }));

      await expect(service.remove(ACTOR, WORKSPACE, TARGET)).rejects.toThrow(ForbiddenException);
      expect(members.remove).not.toHaveBeenCalled();
    });

    it('is 404 for an unknown member or when nothing was deleted', async () => {
      members.find.mockResolvedValue(null);
      await expect(service.remove(ACTOR, WORKSPACE, TARGET)).rejects.toThrow(NotFoundException);

      members.find.mockResolvedValue(member());
      members.remove.mockResolvedValue(false);
      await expect(service.remove(ACTOR, WORKSPACE, TARGET)).rejects.toThrow(NotFoundException);
    });
  });

  describe('leave', () => {
    it('removes the caller from the workspace', async () => {
      members.find.mockResolvedValue(member({ userId: ACTOR }));

      await expect(service.leave(ACTOR, WORKSPACE)).resolves.toBeUndefined();
      expect(members.find).toHaveBeenCalledWith(CTX, ACTOR);
      expect(members.remove).toHaveBeenCalledWith(CTX, ACTOR);
    });

    it('does not let the owner leave', async () => {
      members.find.mockResolvedValue(member({ userId: ACTOR, isOwner: true }));

      await expect(service.leave(ACTOR, WORKSPACE)).rejects.toThrow(ForbiddenException);
      expect(members.remove).not.toHaveBeenCalled();
    });

    it('is 404 when the caller is not a member', async () => {
      members.find.mockResolvedValue(null);

      await expect(service.leave(ACTOR, WORKSPACE)).rejects.toThrow(NotFoundException);
    });
  });

  describe('permission overrides', () => {
    const overrides = [
      { permissionKey: Permission.TASK_DELETE, effect: 'allow' as const },
      { permissionKey: Permission.PROJECT_UPDATE, effect: 'deny' as const },
    ];

    it('lists the overrides of a member', async () => {
      members.listOverrides.mockResolvedValue(overrides);

      await expect(service.listOverrides(ACTOR, WORKSPACE, TARGET)).resolves.toEqual(overrides);
    });

    it('replaces the set, checking only the permissions that are being granted', async () => {
      await expect(
        service.replaceOverrides(ACTOR, WORKSPACE, TARGET, { overrides }),
      ).resolves.toEqual(overrides);

      expect(hasAll).toHaveBeenCalledWith(ACTOR, WORKSPACE, [Permission.TASK_DELETE]);
      expect(members.replaceOverrides).toHaveBeenCalledWith(CTX, TARGET, overrides);
    });

    it('lets a caller deny a permission they do not hold themselves', async () => {
      await service.replaceOverrides(ACTOR, WORKSPACE, TARGET, {
        overrides: [{ permissionKey: Permission.WORKSPACE_DELETE, effect: 'deny' }],
      });

      expect(hasAll).toHaveBeenCalledWith(ACTOR, WORKSPACE, []);
    });

    it('blocks granting a permission the caller does not hold', async () => {
      hasAll.mockResolvedValue(false);

      await expect(
        service.replaceOverrides(ACTOR, WORKSPACE, TARGET, { overrides }),
      ).rejects.toThrow(ForbiddenException);
      expect(members.replaceOverrides).not.toHaveBeenCalled();
    });

    it('rejects two entries for the same permission', async () => {
      await expect(
        service.replaceOverrides(ACTOR, WORKSPACE, TARGET, {
          overrides: [
            { permissionKey: Permission.TASK_READ, effect: 'allow' },
            { permissionKey: Permission.TASK_READ, effect: 'deny' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('does not apply to the owner, who holds every permission anyway', async () => {
      members.find.mockResolvedValue(member({ isOwner: true }));

      await expect(
        service.replaceOverrides(ACTOR, WORKSPACE, TARGET, { overrides }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('clears all overrides with an empty set', async () => {
      await expect(
        service.replaceOverrides(ACTOR, WORKSPACE, TARGET, { overrides: [] }),
      ).resolves.toEqual([]);
    });

    it('is 404 for an unknown member', async () => {
      members.find.mockResolvedValue(null);

      await expect(service.listOverrides(ACTOR, WORKSPACE, TARGET)).rejects.toThrow(
        NotFoundException,
      );
      await expect(
        service.replaceOverrides(ACTOR, WORKSPACE, TARGET, { overrides }),
      ).rejects.toThrow(NotFoundException);
    });

    it('treats dropping a deny as a grant: the caller must hold that permission', async () => {
      members.listOverrides.mockResolvedValue([
        { permissionKey: Permission.PROJECT_UPDATE, effect: 'deny' },
      ]);

      await service.replaceOverrides(ACTOR, WORKSPACE, TARGET, { overrides: [] });
      expect(hasAll).toHaveBeenLastCalledWith(ACTOR, WORKSPACE, [Permission.PROJECT_UPDATE]);

      hasAll.mockResolvedValue(false);
      await expect(
        service.replaceOverrides(ACTOR, WORKSPACE, TARGET, { overrides: [] }),
      ).rejects.toThrow(ForbiddenException);
      expect(members.replaceOverrides).toHaveBeenCalledTimes(1);
    });

    it('also treats turning a deny into an allow, or into nothing else, as a grant', async () => {
      members.listOverrides.mockResolvedValue([
        { permissionKey: Permission.PROJECT_UPDATE, effect: 'deny' },
        { permissionKey: Permission.TASK_READ, effect: 'deny' },
      ]);

      await service.replaceOverrides(ACTOR, WORKSPACE, TARGET, {
        overrides: [
          { permissionKey: Permission.PROJECT_UPDATE, effect: 'allow' },
          { permissionKey: Permission.TASK_READ, effect: 'deny' },
        ],
      });

      expect(hasAll).toHaveBeenLastCalledWith(
        ACTOR,
        WORKSPACE,
        expect.arrayContaining([Permission.PROJECT_UPDATE]),
      );
      expect(hasAll.mock.calls.at(-1)?.[2]).not.toContain(Permission.TASK_READ);
    });

    it('needs no extra check when an existing deny is kept', async () => {
      members.listOverrides.mockResolvedValue([
        { permissionKey: Permission.PROJECT_UPDATE, effect: 'deny' },
      ]);

      await service.replaceOverrides(ACTOR, WORKSPACE, TARGET, {
        overrides: [{ permissionKey: Permission.PROJECT_UPDATE, effect: 'deny' }],
      });

      expect(hasAll).toHaveBeenLastCalledWith(ACTOR, WORKSPACE, []);
    });

    it('does not let anyone change their own overrides, which would lift a deny set by someone else', async () => {
      members.find.mockResolvedValue(member({ userId: ACTOR }));

      await expect(
        service.replaceOverrides(ACTOR, WORKSPACE, ACTOR, { overrides: [] }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.removeOverride(ACTOR, WORKSPACE, ACTOR, Permission.TASK_DELETE),
      ).rejects.toThrow(ForbiddenException);
      expect(members.replaceOverrides).not.toHaveBeenCalled();
      expect(members.removeOverride).not.toHaveBeenCalled();
    });

    it('requires the caller to hold a permission when removing a deny, but not when removing an allow', async () => {
      members.listOverrides.mockResolvedValue([
        { permissionKey: Permission.PROJECT_UPDATE, effect: 'deny' },
        { permissionKey: Permission.TASK_DELETE, effect: 'allow' },
      ]);

      hasAll.mockResolvedValue(false);
      await expect(
        service.removeOverride(ACTOR, WORKSPACE, TARGET, Permission.PROJECT_UPDATE),
      ).rejects.toThrow(ForbiddenException);
      expect(members.removeOverride).not.toHaveBeenCalled();

      await expect(
        service.removeOverride(ACTOR, WORKSPACE, TARGET, Permission.TASK_DELETE),
      ).resolves.toBeUndefined();
      expect(members.removeOverride).toHaveBeenCalledWith(CTX, TARGET, Permission.TASK_DELETE);
    });

    it('refuses to remove an override from the owner', async () => {
      members.find.mockResolvedValue(member({ isOwner: true }));

      await expect(
        service.removeOverride(ACTOR, WORKSPACE, TARGET, Permission.TASK_DELETE),
      ).rejects.toThrow(ForbiddenException);
    });

    it('removes a single override and is 404 when there was none', async () => {
      await expect(
        service.removeOverride(ACTOR, WORKSPACE, TARGET, Permission.TASK_DELETE),
      ).resolves.toBeUndefined();
      expect(members.removeOverride).toHaveBeenCalledWith(CTX, TARGET, Permission.TASK_DELETE);

      members.removeOverride.mockResolvedValue(false);
      await expect(
        service.removeOverride(ACTOR, WORKSPACE, TARGET, Permission.TASK_DELETE),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
