import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { WorkspacesRepository } from '../workspaces.repository';
import { WorkspacesService } from '../workspaces.service';
import type { MyWorkspace } from '../types';

const USER = '0192b1c4-0000-7000-8000-000000000001';
const WORKSPACE = '0192b1c4-0000-7000-8000-0000000000aa';

type RepositoryMock = { [K in keyof WorkspacesRepository]: jest.Mock };

const workspace = (over: Partial<MyWorkspace> = {}): MyWorkspace => ({
  id: WORKSPACE,
  name: 'Acme',
  slug: 'acme',
  ownerId: USER,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  role: { key: 'owner', name: 'Owner' },
  ...over,
});

const uniqueViolation = () => Object.assign(new Error('duplicate key'), { code: '23505' });

describe('WorkspacesService', () => {
  let repository: RepositoryMock;
  let service: WorkspacesService;

  beforeEach(() => {
    repository = {
      create: jest.fn().mockResolvedValue(workspace()),
      listForUser: jest.fn().mockResolvedValue([workspace()]),
      findById: jest.fn().mockResolvedValue(workspace()),
      findBySlug: jest.fn().mockResolvedValue(workspace()),
      update: jest.fn().mockResolvedValue(workspace({ name: 'Acme 2' })),
      remove: jest.fn().mockResolvedValue(true),
      isSlugAvailable: jest.fn().mockResolvedValue(true),
    } as RepositoryMock;
    service = new WorkspacesService(repository as unknown as WorkspacesRepository);
  });

  describe('create', () => {
    it('creates the workspace for the caller and returns it with their role', async () => {
      await expect(service.create(USER, { name: 'Acme', slug: 'acme' })).resolves.toEqual(
        workspace(),
      );
      expect(repository.create).toHaveBeenCalledWith(USER, { name: 'Acme', slug: 'acme' });
    });

    it('rejects a reserved slug without touching the database', async () => {
      await expect(service.create(USER, { name: 'Admin', slug: 'admin' })).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('turns a slug collision into 409', async () => {
      repository.create.mockRejectedValue(uniqueViolation());

      await expect(service.create(USER, { name: 'Acme', slug: 'acme' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('also recognises a collision wrapped by the query builder', async () => {
      repository.create.mockRejectedValue(
        Object.assign(new Error('Failed query'), { cause: uniqueViolation() }),
      );

      await expect(service.create(USER, { name: 'Acme', slug: 'acme' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows anything else', async () => {
      const boom = new Error('connection lost');
      repository.create.mockRejectedValue(boom);

      await expect(service.create(USER, { name: 'Acme', slug: 'acme' })).rejects.toBe(boom);
    });
  });

  describe('listMine', () => {
    it('returns the caller workspaces', async () => {
      await expect(service.listMine(USER)).resolves.toEqual([workspace()]);
      expect(repository.listForUser).toHaveBeenCalledWith(USER);
    });
  });

  describe('getById', () => {
    it('returns the workspace', async () => {
      await expect(service.getById(USER, WORKSPACE)).resolves.toEqual(workspace());
      expect(repository.findById).toHaveBeenCalledWith(USER, WORKSPACE);
    });

    it('is 404 when the caller cannot see it', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getById(USER, WORKSPACE)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBySlug', () => {
    it('looks the workspace up by slug for the caller', async () => {
      await expect(service.getBySlug(USER, 'acme')).resolves.toEqual(workspace());
      expect(repository.findBySlug).toHaveBeenCalledWith(USER, 'acme');
    });

    it('is 404 for a slug the caller is not a member of, exactly like a missing one', async () => {
      repository.findBySlug.mockResolvedValue(null);

      await expect(service.getBySlug(USER, 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkSlug', () => {
    it('reports an available slug', async () => {
      await expect(service.checkSlug(USER, 'acme')).resolves.toEqual({
        slug: 'acme',
        available: true,
        reason: null,
      });
    });

    it('reports a taken slug', async () => {
      repository.isSlugAvailable.mockResolvedValue(false);

      await expect(service.checkSlug(USER, 'acme')).resolves.toEqual({
        slug: 'acme',
        available: false,
        reason: 'taken',
      });
    });

    it.each([
      ['Not A Slug', 'invalid'],
      ['admin', 'reserved'],
    ])('answers %s without a database lookup', async (slug, reason) => {
      await expect(service.checkSlug(USER, slug)).resolves.toEqual({
        slug,
        available: false,
        reason,
      });
      expect(repository.isSlugAvailable).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the given fields', async () => {
      await expect(service.update(USER, WORKSPACE, { name: 'Acme 2' })).resolves.toEqual(
        workspace({ name: 'Acme 2' }),
      );
      expect(repository.update).toHaveBeenCalledWith(USER, WORKSPACE, { name: 'Acme 2' });
    });

    it('rejects an empty update', async () => {
      await expect(service.update(USER, WORKSPACE, {})).rejects.toThrow(BadRequestException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects a reserved slug', async () => {
      await expect(service.update(USER, WORKSPACE, { slug: 'settings' })).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('turns a slug collision into 409', async () => {
      repository.update.mockRejectedValue(uniqueViolation());

      await expect(service.update(USER, WORKSPACE, { slug: 'taken' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('is 404 when no row was updated', async () => {
      repository.update.mockResolvedValue(null);

      await expect(service.update(USER, WORKSPACE, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes the workspace', async () => {
      await expect(service.remove(USER, WORKSPACE)).resolves.toBeUndefined();
      expect(repository.remove).toHaveBeenCalledWith(USER, WORKSPACE);
    });

    it('is 404 when nothing was deleted', async () => {
      repository.remove.mockResolvedValue(false);

      await expect(service.remove(USER, WORKSPACE)).rejects.toThrow(NotFoundException);
    });
  });
});
