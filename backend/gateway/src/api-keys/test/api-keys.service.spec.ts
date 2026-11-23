import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PermissionService } from '../../authorization/permission.service';
import { Permission } from '../../database/schemas/workspace/permission-keys';
import { hashApiKey } from '../api-key.util';
import { ApiKeysRepository } from '../api-keys.repository';
import { ApiKeysService, MAX_ACTIVE_KEYS_PER_WORKSPACE } from '../api-keys.service';
import type { ApiKeyLookup } from '../types';

const USER = '0192b1c4-0000-7000-8000-000000000001';
const WORKSPACE = '0192b1c4-0000-7000-8000-0000000000aa';

type RepositoryMock = { [K in keyof ApiKeysRepository]: jest.Mock };

const stored = (over: Record<string, unknown> = {}) => ({
  id: 'key-1',
  workspaceId: WORKSPACE,
  createdBy: USER,
  name: 'ci',
  keyPrefix: 'sk_abcdefgh',
  keyHash: 'hash',
  permissions: ['ai:use'],
  expiresAt: null,
  revokedAt: null,
  lastUsedAt: null,
  createdAt: new Date('2026-01-01'),
  ...over,
});

const lookup = (over: Partial<ApiKeyLookup> = {}): ApiKeyLookup => ({
  id: 'key-1',
  workspaceId: WORKSPACE,
  createdBy: USER,
  permissions: ['ai:use', 'not-a-real-code'],
  expiresAt: null,
  revokedAt: null,
  creatorActive: true,
  creatorEmail: 'ada@example.com',
  creatorEmailVerified: true,
  ...over,
});

describe('ApiKeysService', () => {
  let repository: RepositoryMock;
  let hasAll: jest.Mock;
  let service: ApiKeysService;

  beforeEach(() => {
    repository = {
      insert: jest.fn(async (_ctx, row) => stored(row)),
      countActive: jest.fn().mockResolvedValue(0),
      list: jest.fn(),
      revoke: jest.fn(),
      findByHash: jest.fn(),
    } as RepositoryMock;
    hasAll = jest.fn().mockResolvedValue(true);
    service = new ApiKeysService(
      repository as unknown as ApiKeysRepository,
      { hasAll } as unknown as PermissionService,
    );
  });

  describe('create', () => {
    const dto = { name: 'ci', permissions: [Permission.AI_USE] };

    it('returns the plaintext key once and stores only its hash and prefix', async () => {
      const created = await service.create(USER, WORKSPACE, dto);

      expect(created.key).toMatch(/^sk_[A-Za-z0-9_-]{43}$/);
      const row = repository.insert.mock.calls[0][1];
      expect(row.keyHash).toBe(hashApiKey(created.key));
      expect(row.keyPrefix).toBe(created.key.slice(0, 11));
      expect(JSON.stringify(row)).not.toContain(created.key);
      expect(created.keyPrefix).toBe(created.key.slice(0, 11));
    });

    it('refuses to grant a permission the creator does not hold', async () => {
      hasAll.mockResolvedValue(false);
      await expect(
        service.create(USER, WORKSPACE, { ...dto, permissions: [Permission.WORKSPACE_DELETE] }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(hasAll).toHaveBeenCalledWith(USER, WORKSPACE, [Permission.WORKSPACE_DELETE]);
      expect(repository.insert).not.toHaveBeenCalled();
    });

    it('rejects an expiry in the past', async () => {
      await expect(
        service.create(USER, WORKSPACE, { ...dto, expiresAt: '2020-01-01T00:00:00Z' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.insert).not.toHaveBeenCalled();
    });

    it('stores a future expiry', async () => {
      const future = new Date(Date.now() + 86_400_000).toISOString();
      await service.create(USER, WORKSPACE, { ...dto, expiresAt: future });
      expect(repository.insert.mock.calls[0][1].expiresAt).toEqual(new Date(future));
    });

    it('stops at the per-workspace limit of active keys', async () => {
      repository.countActive.mockResolvedValue(MAX_ACTIVE_KEYS_PER_WORKSPACE);
      await expect(service.create(USER, WORKSPACE, dto)).rejects.toBeInstanceOf(ConflictException);
      expect(repository.insert).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('never exposes a key hash or the key', async () => {
      repository.list.mockResolvedValue([stored()]);
      const [item] = await service.list(USER, WORKSPACE);
      expect(item).not.toHaveProperty('keyHash');
      expect(item).not.toHaveProperty('key');
      expect(item).toMatchObject({ keyPrefix: 'sk_abcdefgh', permissions: ['ai:use'] });
    });
  });

  describe('revoke', () => {
    it.each(['revoked', 'already-revoked'] as const)('succeeds when the result is %s', async (r) => {
      repository.revoke.mockResolvedValue(r);
      await expect(service.revoke(USER, WORKSPACE, 'key-1')).resolves.toBeUndefined();
    });

    it('answers 404 for a key that is not in the workspace', async () => {
      repository.revoke.mockResolvedValue('missing');
      await expect(service.revoke(USER, WORKSPACE, 'key-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('authenticate', () => {
    it('hashes the presented key and resolves it to the creator with the key scope', async () => {
      repository.findByHash.mockResolvedValue(lookup());

      const principal = await service.authenticate('sk_presented');

      expect(repository.findByHash).toHaveBeenCalledWith(hashApiKey('sk_presented'));
      expect(principal).toEqual({
        userId: USER,
        email: 'ada@example.com',
        emailVerified: true,
        // Unknown codes stored in the database are dropped rather than trusted.
        apiKey: { id: 'key-1', workspaceId: WORKSPACE, permissions: ['ai:use'] },
      });
    });

    it.each([
      ['unknown', null],
      ['revoked', lookup({ revokedAt: new Date() })],
      ['expired', lookup({ expiresAt: new Date(Date.now() - 1000) })],
      ['owned by an inactive user', lookup({ creatorActive: false })],
    ])('rejects a key that is %s', async (_label, found) => {
      repository.findByHash.mockResolvedValue(found);
      await expect(service.authenticate('sk_presented')).resolves.toBeNull();
    });

    it('accepts a key whose expiry is still in the future', async () => {
      repository.findByHash.mockResolvedValue(lookup({ expiresAt: new Date(Date.now() + 60_000) }));
      await expect(service.authenticate('sk_presented')).resolves.not.toBeNull();
    });
  });
});
