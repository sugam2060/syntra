import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PermissionService } from '../authorization/permission.service';
import type { AuthenticatedUser } from '../common/types';
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from '../database/schemas/workspace/permission-keys';
import { generateApiKey, hashApiKey } from './api-key.util';
import { ApiKeysRepository } from './api-keys.repository';
import type { CreateApiKeyDto } from './dto/create-api-key.dto';
import type { ApiKeySummary, CreatedApiKey } from './types';

/** Revoked and expired keys do not count. Checked before insert, so concurrent creates may exceed it. */
export const MAX_ACTIVE_KEYS_PER_WORKSPACE = 20;

const KNOWN_PERMISSIONS: ReadonlySet<string> = new Set(PERMISSION_KEYS);

const onlyKnown = (values: string[]): PermissionKey[] =>
  values.filter((value): value is PermissionKey => KNOWN_PERMISSIONS.has(value));

interface KeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdBy: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
}

const toSummary = (row: KeyRow): ApiKeySummary => ({
  id: row.id,
  name: row.name,
  keyPrefix: row.keyPrefix,
  permissions: onlyKnown(row.permissions),
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  revokedAt: row.revokedAt,
  lastUsedAt: row.lastUsedAt,
});

/**
 * Creates, lists and revokes workspace API keys, and authenticates a presented key.
 *
 * A key acts for the user who created it, limited to the permissions chosen at creation. Both
 * limits apply on every request (see `PermissionGuard`), so removing the creator's rights or
 * revoking the key takes effect on the next call.
 */
@Injectable()
export class ApiKeysService {
  constructor(
    private readonly repository: ApiKeysRepository,
    private readonly permissions: PermissionService,
  ) {}

  /**
   * @throws BadRequestException when `expiresAt` is not in the future.
   * @throws ForbiddenException when the creator tries to grant a permission they do not hold.
   * @throws ConflictException when the workspace already has the maximum number of active keys.
   */
  async create(
    userId: string,
    workspaceId: string,
    dto: CreateApiKeyDto,
  ): Promise<CreatedApiKey> {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    // No privilege escalation: a key can never be given more than its creator holds.
    if (!(await this.permissions.hasAll(userId, workspaceId, dto.permissions))) {
      throw new ForbiddenException('You cannot grant permissions you do not hold');
    }

    const ctx = { userId, workspaceId };
    if ((await this.repository.countActive(ctx)) >= MAX_ACTIVE_KEYS_PER_WORKSPACE) {
      throw new ConflictException(
        `A workspace can have at most ${MAX_ACTIVE_KEYS_PER_WORKSPACE} active API keys`,
      );
    }

    const generated = generateApiKey();
    const created = await this.repository.insert(ctx, {
      name: dto.name,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      permissions: dto.permissions,
      expiresAt,
    });
    return { ...toSummary(created), key: generated.key };
  }

  /** All keys of the workspace, newest first, including revoked and expired ones. */
  async list(userId: string, workspaceId: string): Promise<ApiKeySummary[]> {
    return (await this.repository.list({ userId, workspaceId })).map(toSummary);
  }

  /**
   * Idempotent: revoking an already revoked key succeeds.
   * @throws NotFoundException when the key does not exist in the workspace.
   */
  async revoke(userId: string, workspaceId: string, keyId: string): Promise<void> {
    const result = await this.repository.revoke({ userId, workspaceId }, keyId);
    if (result === 'missing') throw new NotFoundException('API key not found');
  }

  /**
   * Resolves a presented key to the caller it acts as, or null when it is unknown, revoked,
   * expired, or its creator is no longer active. Callers must answer all four identically.
   */
  async authenticate(presentedKey: string): Promise<AuthenticatedUser | null> {
    const key = await this.repository.findByHash(hashApiKey(presentedKey));
    if (!key || key.revokedAt || !key.creatorActive) return null;
    if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) return null;

    return {
      userId: key.createdBy,
      email: key.creatorEmail,
      emailVerified: key.creatorEmailVerified,
      apiKey: {
        id: key.id,
        workspaceId: key.workspaceId,
        permissions: onlyKnown(key.permissions),
      },
    };
  }
}
