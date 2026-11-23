import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { TokenService } from '../../src/authentication/token.service';
import {
  Permission,
  PERMISSION_DENIED_MESSAGE,
  RequiredPermission,
  WorkspaceId,
} from '../../src/authorization';
import { Public } from '../../src/common/decorators/public.decorator';
import { FixtureUser, WorkspaceFixture } from './helpers/workspace-fixture';

/** Test-only routes: the app has no workspace-scoped controller yet. */
@Controller('workspaces/:workspaceId/probe')
class ProbeController {
  @Get('ai')
  @RequiredPermission(Permission.AI_USE)
  ai(@WorkspaceId() workspaceId: string) {
    return { workspaceId };
  }

  @Get('delete')
  @RequiredPermission(Permission.WORKSPACE_DELETE)
  remove() {
    return { ok: true };
  }

  @Get('both')
  @RequiredPermission(Permission.TASK_UPDATE, Permission.PROJECT_DELETE)
  both() {
    return { ok: true };
  }

  @Get('open')
  open() {
    return { ok: true };
  }

  @Public()
  @Get('misconfigured')
  @RequiredPermission(Permission.AI_USE)
  misconfigured() {
    return { ok: true };
  }
}

describe('PermissionGuard (e2e)', () => {
  const fixture = new WorkspaceFixture();
  let app: INestApplication;
  const bearer = {} as Record<FixtureUser, string>;

  beforeAll(async () => {
    await fixture.setUp();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    const tokens = moduleRef.get(TokenService, { strict: false });
    for (const user of ['owner', 'admin', 'member', 'viewer', 'outsider'] as const) {
      const { token } = await tokens.signAccessToken({
        id: fixture.ids[user],
        email: fixture.emails[user],
        emailVerified: true,
      });
      bearer[user] = token;
    }
  });

  afterAll(async () => {
    await app.close();
    await fixture.tearDown();
  });

  afterEach(() => fixture.clearOverrides());

  const probe = (path: string, workspaceId = fixture.workspaceId) =>
    request(app.getHttpServer()).get(`/api/v1/workspaces/${workspaceId}/probe/${path}`);

  const as = (user: FixtureUser, path: string, workspaceId?: string) =>
    probe(path, workspaceId).set('Authorization', `Bearer ${bearer[user]}`);

  describe('authentication comes first', () => {
    it('answers 401 without a token, before any permission check', async () => {
      await probe('ai').expect(401);
      await probe('ai').set('Authorization', 'Bearer garbage').expect(401);
    });

    it('answers 401 for a route that is both @Public and permission-protected', async () => {
      await probe('misconfigured').expect(401);
    });
  });

  describe('workspace id validation', () => {
    it('answers 400 for a route parameter that is not a UUID', async () => {
      const response = await as('owner', 'ai', 'not-a-uuid').expect(400);
      expect(response.body.message).toMatch(/workspaceId/);
    });
  });

  describe('@RequiredPermission(Permission.AI_USE)', () => {
    it.each<[FixtureUser, number]>([
      ['owner', 200],
      ['admin', 200],
      ['member', 200],
      ['viewer', 403],
      ['outsider', 403],
    ])('%s gets %i', async (user, status) => {
      await as(user, 'ai').expect(status);
    });

    it('hands the validated workspace id to the handler through @WorkspaceId()', async () => {
      const response = await as('member', 'ai').expect(200);
      expect(response.body).toEqual({ workspaceId: fixture.workspaceId });
    });
  });

  describe('owner-only and multi-code routes', () => {
    it('keeps workspace:delete for the owner only', async () => {
      await as('owner', 'delete').expect(200);
      await as('admin', 'delete').expect(403);
      await as('member', 'delete').expect(403);
    });

    it('requires every code on the route', async () => {
      await as('admin', 'both').expect(200);
      await as('owner', 'both').expect(200);
      // The member can update tasks but cannot delete projects.
      await as('member', 'both').expect(403);
    });
  });

  describe('per-member overrides', () => {
    it('blocks a member with a deny override even though the role allows it', async () => {
      await as('member', 'ai').expect(200);
      await fixture.setOverride('member', Permission.AI_USE, 'deny');
      await as('member', 'ai').expect(403);
    });

    it('lets a viewer through with an allow override', async () => {
      await as('viewer', 'ai').expect(403);
      await fixture.setOverride('viewer', Permission.AI_USE, 'allow');
      await as('viewer', 'ai').expect(200);
    });
  });

  describe('denial does not leak workspace information', () => {
    it('returns the same 403 body for a missing permission, a non-member and an unknown workspace', async () => {
      const missing = await as('viewer', 'ai').expect(403);
      const outsider = await as('outsider', 'ai').expect(403);
      const unknown = await as('member', 'ai', randomUUID()).expect(403);
      const foreign = await as('member', 'ai', fixture.otherWorkspaceId).expect(403);

      for (const response of [missing, outsider, unknown, foreign]) {
        expect(response.body).toEqual({
          statusCode: 403,
          error: 'Forbidden',
          message: PERMISSION_DENIED_MESSAGE,
        });
      }
    });
  });

  describe('rate limiting', () => {
    it('does not apply the strict auth throttler to ordinary routes', async () => {
      // The strict limit is 10 per window by default; ordinary routes only use the default limit.
      for (let i = 0; i < 15; i += 1) {
        await as('member', 'ai').expect(200);
      }
    });
  });

  describe('opt-in behaviour', () => {
    it('does not permission-check routes without the decorator (any signed-in user passes)', async () => {
      await as('outsider', 'open').expect(200);
      await probe('open').expect(401);
    });
  });
});
