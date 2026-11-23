import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { Permission, PermissionService } from '../../src/authorization';
import { WorkspaceFixture } from './helpers/workspace-fixture';

/** PermissionService against the real database rules (owner, role, override) as `app_user`. */
describe('PermissionService (integration)', () => {
  const fixture = new WorkspaceFixture();
  let app: INestApplication;
  let service: PermissionService;

  beforeAll(async () => {
    await fixture.setUp();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    service = moduleRef.get(PermissionService);
  });

  afterAll(async () => {
    await app.close();
    await fixture.tearDown();
  });

  afterEach(() => fixture.clearOverrides());

  const can = (user: Parameters<WorkspaceFixture['setOverride']>[0], ...codes: string[]) =>
    service.hasAll(fixture.ids[user], fixture.workspaceId, codes as never);

  it('gives the owner every permission, including the owner-only ones', async () => {
    await expect(can('owner', Permission.WORKSPACE_DELETE)).resolves.toBe(true);
    await expect(can('owner', Permission.AI_USE, Permission.MEMBER_UPDATE_ROLE)).resolves.toBe(true);
  });

  it('follows the role: admin lacks workspace:delete, member can edit tasks, viewer cannot', async () => {
    await expect(can('admin', Permission.WORKSPACE_DELETE)).resolves.toBe(false);
    await expect(can('admin', Permission.MEMBER_INVITE)).resolves.toBe(true);
    await expect(can('member', Permission.TASK_UPDATE)).resolves.toBe(true);
    await expect(can('member', Permission.PROJECT_DELETE)).resolves.toBe(false);
    await expect(can('viewer', Permission.TASK_READ)).resolves.toBe(true);
    await expect(can('viewer', Permission.TASK_UPDATE)).resolves.toBe(false);
  });

  it('denies non-members and unknown workspaces', async () => {
    await expect(can('outsider', Permission.TASK_READ)).resolves.toBe(false);
    await expect(
      service.hasAll(fixture.ids.member, randomUUID(), [Permission.TASK_READ]),
    ).resolves.toBe(false);
    // A real workspace the user does not belong to.
    await expect(
      service.hasAll(fixture.ids.member, fixture.otherWorkspaceId, [Permission.TASK_READ]),
    ).resolves.toBe(false);
  });

  it('requires every code: one missing code denies the whole request', async () => {
    await expect(can('member', Permission.TASK_UPDATE, Permission.AI_USE)).resolves.toBe(true);
    await expect(can('member', Permission.TASK_UPDATE, Permission.PROJECT_DELETE)).resolves.toBe(false);
  });

  it('lets a deny override beat the role and an allow override extend it', async () => {
    await fixture.setOverride('member', Permission.AI_USE, 'deny');
    await fixture.setOverride('viewer', Permission.AI_USE, 'allow');

    await expect(can('member', Permission.AI_USE)).resolves.toBe(false);
    await expect(can('member', Permission.TASK_UPDATE)).resolves.toBe(true);
    await expect(can('viewer', Permission.AI_USE)).resolves.toBe(true);
    await expect(can('viewer', Permission.TASK_UPDATE)).resolves.toBe(false);
  });

  it('never lets an override reduce the owner', async () => {
    await expect(can('owner', Permission.AI_USE)).resolves.toBe(true);
  });

  it('treats an unknown code as denied rather than failing', async () => {
    await expect(can('owner', 'ai:telepathy')).resolves.toBe(true);
    await expect(can('member', 'ai:telepathy')).resolves.toBe(false);
  });
});
