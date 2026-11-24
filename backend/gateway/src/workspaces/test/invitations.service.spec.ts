import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PermissionService } from '../../authorization/permission.service';
import { hashToken } from '../../common/utils/opaque-token.util';
import type { AppConfig } from '../../config/types';
import { Permission } from '../../database/schemas/workspace/permission-keys';
import type { EmailProducer } from '../../jobs/email/email.producer';
import type { InvitationsRepository } from '../invitations.repository';
import { InvitationsService } from '../invitations.service';
import type { MembersRepository } from '../members.repository';
import type { RolesRepository } from '../roles.repository';
import type {
  InvitationPreview,
  InvitationSummary,
  MemberSummary,
  MyWorkspace,
  RoleSummary,
} from '../types';
import type { WorkspacesRepository } from '../workspaces.repository';

const ACTOR = '0192b1c4-0000-7000-8000-000000000001';
const WORKSPACE = '0192b1c4-0000-7000-8000-0000000000aa';
const ROLE = '0192b1c4-0000-7000-8000-0000000000bb';
const INVITATION = '0192b1c4-0000-7000-8000-0000000000cc';
const CTX = { userId: ACTOR, workspaceId: WORKSPACE };
const DAY = 24 * 60 * 60 * 1000;

const appConfig: AppConfig = {
  port: 3000,
  apiPrefix: 'api/v1',
  frontendUrl: 'http://localhost:3001',
  isProduction: false,
  trustProxy: false,
  maintenance: { authCleanupCron: '0 3 * * *' },
  throttle: { ttlMs: 60_000, limit: 120, authLimit: 10 },
};
const workspaceConfig = { invitationTtlDays: 7 };

type Mock<T> = { [K in keyof T]: jest.Mock };

const role = (over: Partial<RoleSummary> = {}): RoleSummary => ({
  id: ROLE,
  key: 'member',
  name: 'Member',
  isSystem: true,
  permissions: [Permission.TASK_READ],
  ...over,
});

const summary = (over: Partial<InvitationSummary> = {}): InvitationSummary => ({
  id: INVITATION,
  email: 'new@example.com',
  role: { id: ROLE, key: 'member', name: 'Member' },
  invitedBy: { id: ACTOR, name: 'Ada' },
  createdAt: new Date('2026-01-01'),
  expiresAt: new Date(Date.now() + 7 * DAY),
  status: 'pending',
  ...over,
});

const uniqueViolation = () => Object.assign(new Error('duplicate key'), { code: '23505' });

describe('InvitationsService', () => {
  let invitations: Mock<InvitationsRepository>;
  let roles: Mock<Pick<RolesRepository, 'find'>>;
  let members: Mock<Pick<MembersRepository, 'find'>>;
  let workspaces: Mock<Pick<WorkspacesRepository, 'findById'>>;
  let hasAll: jest.Mock;
  let sendWorkspaceInvitation: jest.Mock;
  let service: InvitationsService;

  const sentLink = (call = 0): string => sendWorkspaceInvitation.mock.calls[call][0].link;
  const sentToken = (call = 0): string => new URL(sentLink(call)).searchParams.get('token') ?? '';

  beforeEach(() => {
    invitations = {
      list: jest.fn().mockResolvedValue([summary()]),
      find: jest.fn().mockResolvedValue(summary()),
      findPendingByEmail: jest.fn().mockResolvedValue(null),
      isMemberEmail: jest.fn().mockResolvedValue(false),
      insert: jest.fn(async (_ctx, row) => summary({ email: row.email, expiresAt: row.expiresAt })),
      rotate: jest.fn(async (_ctx, _id, _hash, expiresAt) => summary({ expiresAt })),
      revoke: jest.fn().mockResolvedValue(true),
      listMine: jest.fn().mockResolvedValue([]),
      preview: jest.fn().mockResolvedValue(null),
      accept: jest.fn().mockResolvedValue({ status: 'accepted', workspaceId: WORKSPACE }),
      decline: jest.fn().mockResolvedValue(true),
    } as Mock<InvitationsRepository>;
    roles = { find: jest.fn().mockResolvedValue(role()) };
    members = {
      find: jest.fn().mockResolvedValue({ userId: ACTOR, name: 'Ada' } as MemberSummary),
    };
    workspaces = {
      findById: jest.fn().mockResolvedValue({ id: WORKSPACE, name: 'Acme' } as MyWorkspace),
    };
    hasAll = jest.fn().mockResolvedValue(true);
    sendWorkspaceInvitation = jest.fn().mockResolvedValue(undefined);

    service = new InvitationsService(
      invitations as unknown as InvitationsRepository,
      roles as unknown as RolesRepository,
      members as unknown as MembersRepository,
      workspaces as unknown as WorkspacesRepository,
      { hasAll } as unknown as PermissionService,
      { sendWorkspaceInvitation } as unknown as EmailProducer,
      workspaceConfig,
      appConfig,
    );
  });

  describe('invite', () => {
    const dto = { emails: ['new@example.com'], roleId: ROLE };

    it('creates the invitation and emails a link carrying the raw token', async () => {
      const [result] = await service.invite(ACTOR, WORKSPACE, dto);

      expect(result).toMatchObject({ email: 'new@example.com', outcome: 'invited' });
      expect(result.invitation).not.toBeNull();
      expect(sentLink()).toMatch(
        /^http:\/\/localhost:3001\/invitations\/accept\?token=[A-Za-z0-9_-]{43}$/,
      );
      expect(sendWorkspaceInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          workspaceName: 'Acme',
          inviterName: 'Ada',
          roleName: 'Member',
          message: null,
        }),
      );
    });

    it('stores only the hash of the token and an expiry of the configured number of days', async () => {
      const before = Date.now();
      await service.invite(ACTOR, WORKSPACE, dto);

      const row = invitations.insert.mock.calls[0][1];
      expect(row.tokenHash).toBe(hashToken(sentToken()));
      expect(JSON.stringify(row)).not.toContain(sentToken());
      expect(row.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7 * DAY);
      expect(row.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 7 * DAY);
      expect(invitations.insert).toHaveBeenCalledWith(CTX, expect.objectContaining({
        email: 'new@example.com',
        roleId: ROLE,
      }));
    });

    it('passes the personal message to the email', async () => {
      await service.invite(ACTOR, WORKSPACE, { ...dto, message: 'Welcome!' });

      expect(sendWorkspaceInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Welcome!' }),
      );
    });

    it('never offers the owner role', async () => {
      roles.find.mockResolvedValue(role({ key: 'owner' }));

      await expect(service.invite(ACTOR, WORKSPACE, dto)).rejects.toThrow(ForbiddenException);
      expect(invitations.insert).not.toHaveBeenCalled();
    });

    it('does not let the caller invite into a role above their own permissions', async () => {
      hasAll.mockResolvedValue(false);

      await expect(service.invite(ACTOR, WORKSPACE, dto)).rejects.toThrow(ForbiddenException);
      expect(hasAll).toHaveBeenCalledWith(ACTOR, WORKSPACE, role().permissions);
      expect(invitations.insert).not.toHaveBeenCalled();
    });

    it('is 404 for an unknown role or workspace', async () => {
      roles.find.mockResolvedValue(null);
      await expect(service.invite(ACTOR, WORKSPACE, dto)).rejects.toThrow(NotFoundException);

      roles.find.mockResolvedValue(role());
      workspaces.findById.mockResolvedValue(null);
      await expect(service.invite(ACTOR, WORKSPACE, dto)).rejects.toThrow(NotFoundException);
    });

    it('reports someone who is already a member without inviting them', async () => {
      invitations.isMemberEmail.mockResolvedValue(true);

      const [result] = await service.invite(ACTOR, WORKSPACE, dto);

      expect(result).toEqual({ email: 'new@example.com', outcome: 'already_member', invitation: null });
      expect(invitations.insert).not.toHaveBeenCalled();
      expect(sendWorkspaceInvitation).not.toHaveBeenCalled();
    });

    it('reports a live pending invitation instead of creating a second one', async () => {
      invitations.findPendingByEmail.mockResolvedValue({
        id: INVITATION,
        expiresAt: new Date(Date.now() + DAY),
      });

      const [result] = await service.invite(ACTOR, WORKSPACE, dto);

      expect(result.outcome).toBe('already_invited');
      expect(invitations.insert).not.toHaveBeenCalled();
      expect(sendWorkspaceInvitation).not.toHaveBeenCalled();
    });

    it('replaces an expired pending invitation, which would otherwise block the address forever', async () => {
      invitations.findPendingByEmail.mockResolvedValue({
        id: INVITATION,
        expiresAt: new Date(Date.now() - DAY),
      });

      const [result] = await service.invite(ACTOR, WORKSPACE, dto);

      expect(invitations.revoke).toHaveBeenCalledWith(CTX, INVITATION);
      expect(result.outcome).toBe('invited');
    });

    it('treats a lost race on the unique index as already invited', async () => {
      invitations.insert.mockRejectedValue(uniqueViolation());

      const [result] = await service.invite(ACTOR, WORKSPACE, dto);

      expect(result.outcome).toBe('already_invited');
      expect(sendWorkspaceInvitation).not.toHaveBeenCalled();
    });

    it('rethrows unexpected database errors', async () => {
      const boom = new Error('connection lost');
      invitations.insert.mockRejectedValue(boom);

      await expect(service.invite(ACTOR, WORKSPACE, dto)).rejects.toBe(boom);
    });

    it('still succeeds when the email cannot be queued', async () => {
      sendWorkspaceInvitation.mockRejectedValue(new Error('redis down'));

      const [result] = await service.invite(ACTOR, WORKSPACE, dto);

      expect(result.outcome).toBe('invited');
    });

    it('handles each address on its own and keeps their order', async () => {
      invitations.isMemberEmail.mockImplementation(async (_ctx, email: string) => email === 'a@example.com');

      const results = await service.invite(ACTOR, WORKSPACE, {
        ...dto,
        emails: ['a@example.com', 'b@example.com', 'c@example.com'],
      });

      expect(results.map((r) => [r.email, r.outcome])).toEqual([
        ['a@example.com', 'already_member'],
        ['b@example.com', 'invited'],
        ['c@example.com', 'invited'],
      ]);
      expect(sentToken(0)).not.toBe(sentToken(1));
    });

    it('collapses addresses that differ only by case', async () => {
      const results = await service.invite(ACTOR, WORKSPACE, {
        ...dto,
        emails: ['Dup@Example.com', 'dup@example.com'],
      });

      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('dup@example.com');
    });
  });

  describe('list', () => {
    it('lists open invitations', async () => {
      const open = summary();
      invitations.list.mockResolvedValue([open]);

      await expect(service.list(ACTOR, WORKSPACE)).resolves.toEqual([open]);
      expect(invitations.list).toHaveBeenCalledWith(CTX);
    });
  });

  describe('resend', () => {
    it('issues a new token and expiry, and emails the new link', async () => {
      const before = Date.now();
      const result = await service.resend(ACTOR, WORKSPACE, INVITATION);

      const [, id, hash, expiresAt] = invitations.rotate.mock.calls[0];
      expect(id).toBe(INVITATION);
      expect(hash).toBe(hashToken(sentToken()));
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7 * DAY);
      expect(result.id).toBe(INVITATION);
      expect(sendWorkspaceInvitation).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com', roleName: 'Member' }),
      );
    });

    it('is 404 for an invitation that is gone, used or revoked', async () => {
      invitations.find.mockResolvedValue(null);
      await expect(service.resend(ACTOR, WORKSPACE, INVITATION)).rejects.toThrow(NotFoundException);

      invitations.find.mockResolvedValue(summary());
      invitations.rotate.mockResolvedValue(null);
      await expect(service.resend(ACTOR, WORKSPACE, INVITATION)).rejects.toThrow(NotFoundException);
      expect(sendWorkspaceInvitation).not.toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('revokes an open invitation', async () => {
      await expect(service.revoke(ACTOR, WORKSPACE, INVITATION)).resolves.toBeUndefined();
      expect(invitations.revoke).toHaveBeenCalledWith(CTX, INVITATION);
    });

    it('is 404 when there is nothing to revoke', async () => {
      invitations.revoke.mockResolvedValue(false);

      await expect(service.revoke(ACTOR, WORKSPACE, INVITATION)).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMine', () => {
    it('lists the invitations addressed to the caller', async () => {
      await service.listMine(ACTOR);

      expect(invitations.listMine).toHaveBeenCalledWith(ACTOR);
    });
  });

  describe('preview', () => {
    const preview: InvitationPreview = {
      workspaceName: 'Acme',
      roleName: 'Member',
      inviterName: 'Ada',
      invitedEmail: 'new@example.com',
      status: 'pending',
      expiresAt: new Date(Date.now() + DAY),
    };

    it('looks the token up by its hash', async () => {
      invitations.preview.mockResolvedValue(preview);

      await expect(service.preview('t'.repeat(43))).resolves.toEqual(preview);
      expect(invitations.preview).toHaveBeenCalledWith(hashToken('t'.repeat(43)));
    });

    it('is 404 for an unknown token', async () => {
      await expect(service.preview('t'.repeat(43))).rejects.toThrow(NotFoundException);
    });
  });

  describe('accept', () => {
    it('accepts by emailed token, sending only its hash to the database', async () => {
      await expect(service.accept(ACTOR, { token: 't'.repeat(43) })).resolves.toEqual({
        workspaceId: WORKSPACE,
      });
      expect(invitations.accept).toHaveBeenCalledWith(ACTOR, { tokenHash: hashToken('t'.repeat(43)) });
    });

    it('accepts by invitation id', async () => {
      await service.accept(ACTOR, { invitationId: INVITATION });

      expect(invitations.accept).toHaveBeenCalledWith(ACTOR, { invitationId: INVITATION });
    });

    it('requires exactly one of token and invitationId', async () => {
      await expect(service.accept(ACTOR, {})).rejects.toThrow(BadRequestException);
      await expect(
        service.accept(ACTOR, { token: 't'.repeat(43), invitationId: INVITATION }),
      ).rejects.toThrow(BadRequestException);
      expect(invitations.accept).not.toHaveBeenCalled();
    });

    it('gives one generic 400 for unknown, expired, revoked, used or someone else’s invitation', async () => {
      invitations.accept.mockResolvedValue({ status: 'invalid' });

      await expect(service.accept(ACTOR, { invitationId: INVITATION })).rejects.toThrow(
        new BadRequestException('Invalid or expired invitation'),
      );
    });

    it('asks for a verified email with the same code the auth module uses', async () => {
      invitations.accept.mockResolvedValue({ status: 'email-not-verified' });

      const error = await service
        .accept(ACTOR, { invitationId: INVITATION })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        error: 'EMAIL_NOT_VERIFIED',
      });
    });
  });

  describe('decline', () => {
    it('declines an invitation addressed to the caller', async () => {
      await expect(service.decline(ACTOR, INVITATION)).resolves.toBeUndefined();
      expect(invitations.decline).toHaveBeenCalledWith(ACTOR, INVITATION);
    });

    it('is 404 when it is not theirs or is already closed', async () => {
      invitations.decline.mockResolvedValue(false);

      await expect(service.decline(ACTOR, INVITATION)).rejects.toThrow(NotFoundException);
    });
  });
});
