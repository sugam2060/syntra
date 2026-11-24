import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PermissionService } from '../../authorization/permission.service';
import { Permission } from '../../database/schemas/workspace/permission-keys';
import type { RolesRepository } from '../roles.repository';
import { RolesService } from '../roles.service';
import type { RoleSummary } from '../types';

const USER = '0192b1c4-0000-7000-8000-000000000001';
const WORKSPACE = '0192b1c4-0000-7000-8000-0000000000aa';
const ROLE = '0192b1c4-0000-7000-8000-0000000000bb';

type RepositoryMock = { [K in keyof RolesRepository]: jest.Mock };

const role = (over: Partial<RoleSummary> = {}): RoleSummary => ({
  id: ROLE,
  key: 'qa',
  name: 'QA',
  isSystem: false,
  permissions: [Permission.TASK_READ],
  ...over,
});

const uniqueViolation = () => Object.assign(new Error('duplicate key'), { code: '23505' });

describe('RolesService', () => {
  let repository: RepositoryMock;
  let hasAll: jest.Mock;
  let service: RolesService;

  beforeEach(() => {
    repository = {
      list: jest.fn().mockResolvedValue([role()]),
      find: jest.fn().mockResolvedValue(role()),
      create: jest.fn(async (_ctx, input) => role({ ...input, id: ROLE })),
      update: jest.fn().mockResolvedValue(role({ name: 'QA 2' })),
      remove: jest.fn().mockResolvedValue('deleted'),
      listPermissions: jest.fn().mockResolvedValue([]),
    } as RepositoryMock;
    hasAll = jest.fn().mockResolvedValue(true);
    service = new RolesService(
      repository as unknown as RolesRepository,
      { hasAll } as unknown as PermissionService,
    );
  });

  describe('list and permission catalogue', () => {
    it('lists the roles usable in the workspace', async () => {
      await expect(service.list(USER, WORKSPACE)).resolves.toEqual([role()]);
      expect(repository.list).toHaveBeenCalledWith({ userId: USER, workspaceId: WORKSPACE });
    });

    it('lists the permission catalogue', async () => {
      repository.listPermissions.mockResolvedValue([{ key: 'task:read', description: 'Read tasks' }]);

      await expect(service.listPermissions(USER, WORKSPACE)).resolves.toEqual([
        { key: 'task:read', description: 'Read tasks' },
      ]);
    });
  });

  describe('create', () => {
    const dto = { name: 'Release Manager', permissions: [Permission.TASK_READ, Permission.TASK_UPDATE] };

    it('derives the key from the name and stores the permissions', async () => {
      const created = await service.create(USER, WORKSPACE, dto);

      expect(repository.create).toHaveBeenCalledWith(
        { userId: USER, workspaceId: WORKSPACE },
        { key: 'release-manager', name: 'Release Manager', permissions: dto.permissions },
      );
      expect(created.key).toBe('release-manager');
    });

    it('refuses to grant permissions the caller does not hold', async () => {
      hasAll.mockResolvedValue(false);

      await expect(service.create(USER, WORKSPACE, dto)).rejects.toThrow(ForbiddenException);
      expect(hasAll).toHaveBeenCalledWith(USER, WORKSPACE, dto.permissions);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a name that yields no key', async () => {
      await expect(service.create(USER, WORKSPACE, { ...dto, name: '***' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it.each(['Owner', 'ADMIN', 'member', 'Viewer'])(
      'will not shadow the system role key from "%s"',
      async (name) => {
        await expect(service.create(USER, WORKSPACE, { ...dto, name })).rejects.toThrow(
          ConflictException,
        );
        expect(repository.create).not.toHaveBeenCalled();
      },
    );

    it('answers 409 when the workspace already has a role with that key', async () => {
      repository.create.mockRejectedValue(uniqueViolation());

      await expect(service.create(USER, WORKSPACE, dto)).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected errors', async () => {
      const boom = new Error('down');
      repository.create.mockRejectedValue(boom);

      await expect(service.create(USER, WORKSPACE, dto)).rejects.toBe(boom);
    });
  });

  describe('update', () => {
    it('renames a custom role without any permission check', async () => {
      await expect(service.update(USER, WORKSPACE, ROLE, { name: 'QA 2' })).resolves.toEqual(
        role({ name: 'QA 2' }),
      );
      expect(hasAll).not.toHaveBeenCalled();
      expect(repository.update).toHaveBeenCalledWith(
        { userId: USER, workspaceId: WORKSPACE },
        ROLE,
        { name: 'QA 2' },
      );
    });

    it('checks the caller holds every permission it sets', async () => {
      hasAll.mockResolvedValue(false);

      await expect(
        service.update(USER, WORKSPACE, ROLE, { permissions: [Permission.WORKSPACE_DELETE] }),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects an empty update', async () => {
      await expect(service.update(USER, WORKSPACE, ROLE, {})).rejects.toThrow(BadRequestException);
    });

    it('does not modify system roles', async () => {
      repository.find.mockResolvedValue(role({ isSystem: true, key: 'admin' }));

      await expect(service.update(USER, WORKSPACE, ROLE, { name: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('is 404 for a role that is not visible in this workspace', async () => {
      repository.find.mockResolvedValue(null);

      await expect(service.update(USER, WORKSPACE, ROLE, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('is 404 when the update touched no row', async () => {
      repository.update.mockResolvedValue(null);

      await expect(service.update(USER, WORKSPACE, ROLE, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes an unused custom role', async () => {
      await expect(service.remove(USER, WORKSPACE, ROLE)).resolves.toBeUndefined();
      expect(repository.remove).toHaveBeenCalledWith(
        { userId: USER, workspaceId: WORKSPACE },
        ROLE,
      );
    });

    it('does not delete system roles', async () => {
      repository.find.mockResolvedValue(role({ isSystem: true }));

      await expect(service.remove(USER, WORKSPACE, ROLE)).rejects.toThrow(ForbiddenException);
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('answers 409 while members or invitations still use the role', async () => {
      repository.remove.mockResolvedValue('in-use');

      await expect(service.remove(USER, WORKSPACE, ROLE)).rejects.toThrow(ConflictException);
    });

    it('is 404 when the role does not exist', async () => {
      repository.find.mockResolvedValue(null);
      await expect(service.remove(USER, WORKSPACE, ROLE)).rejects.toThrow(NotFoundException);

      repository.find.mockResolvedValue(role());
      repository.remove.mockResolvedValue('missing');
      await expect(service.remove(USER, WORKSPACE, ROLE)).rejects.toThrow(NotFoundException);
    });
  });
});
