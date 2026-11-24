import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { configureApp } from '../../../src/app.setup';
import { TokenService } from '../../../src/authentication/token.service';
import { EmailProducer } from '../../../src/jobs/email/email.producer';
import type { WorkspaceInvitationEmailJob } from '../../../src/jobs/email/types';
import { FixtureUser, WorkspaceFixture } from '../../authorization/helpers/workspace-fixture';

/** Captures invitation emails instead of queueing them, so tests can read the accept link. */
export class EmailProducerStub {
  invitations: WorkspaceInvitationEmailJob[] = [];

  async sendVerification(): Promise<void> {}
  async sendPasswordReset(): Promise<void> {}
  async sendWorkspaceInvitation(job: WorkspaceInvitationEmailJob): Promise<void> {
    this.invitations.push(job);
  }

  /** Raw token from the most recent invitation email sent to `email`. */
  tokenFor(email: string): string {
    const job = [...this.invitations].reverse().find((candidate) => candidate.email === email);
    if (!job) throw new Error(`No invitation email was sent to ${email}`);
    return new URL(job.link).searchParams.get('token') ?? '';
  }
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
}

/**
 * Boots the real application against the real database, with the email producer stubbed, and
 * signs access tokens for the fixture users. Remember to call `close()` in `afterAll`.
 */
export class WorkspacesE2e {
  readonly fixture = new WorkspaceFixture();
  readonly emails = new EmailProducerStub();
  readonly bearer = {} as Record<FixtureUser, string>;
  app!: INestApplication;
  /** Connection as the table owner, for setup and assertions that row level security would hide. */
  db!: Client;
  private tokens!: TokenService;
  private readonly createdUserEmails: string[] = [];

  async start(): Promise<void> {
    Object.assign(process.env, { THROTTLE_LIMIT: '1000', AUTH_THROTTLE_LIMIT: '1000' });
    await this.fixture.setUp();
    this.db = new Client({
      connectionString: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await this.db.connect();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailProducer)
      .useValue(this.emails)
      .compile();
    this.app = moduleRef.createNestApplication();
    configureApp(this.app);
    await this.app.init();

    this.tokens = moduleRef.get(TokenService, { strict: false });
    for (const user of ['owner', 'admin', 'member', 'viewer', 'outsider'] as const) {
      this.bearer[user] = (
        await this.tokens.signAccessToken({
          id: this.fixture.ids[user],
          email: this.fixture.emails[user],
          emailVerified: true,
        })
      ).token;
    }
  }

  async close(): Promise<void> {
    await this.app.close();
    if (this.createdUserEmails.length > 0) {
      await this.db.query(`DELETE FROM public.users WHERE email = ANY($1::text[])`, [
        this.createdUserEmails,
      ]);
    }
    await this.db.end();
    await this.fixture.tearDown();
  }

  http() {
    return request(this.app.getHttpServer());
  }

  as(user: FixtureUser) {
    return { Authorization: `Bearer ${this.bearer[user]}` };
  }

  /** Slug that the fixture teardown also cleans up (`perm-%<runId>`). */
  slug(name: string): string {
    return `perm-${name}-${this.fixture.runId}`;
  }

  /** A new user who can sign in; `verified: false` leaves the email unverified. */
  async newUser(name: string, verified = true): Promise<TestUser> {
    const email = `perm-${this.fixture.runId}-x-${name}@test.local`;
    this.createdUserEmails.push(email);
    const { rows } = await this.db.query<{ id: string }>(
      `SELECT app.auth_create_user($1, $2, 'hash', $3) AS id`,
      [email, name, verified],
    );
    const { token } = await this.tokens.signAccessToken({
      id: rows[0].id,
      email,
      emailVerified: verified,
    });
    return { id: rows[0].id, email, token };
  }

  /** Creates a workspace through the API as `owner` and returns its id. */
  async createWorkspace(name: string, as: FixtureUser = 'owner'): Promise<string> {
    const res = await this.http()
      .post('/api/v1/workspaces')
      .set(this.as(as))
      .send({ name: `Workspace ${name}`, slug: this.slug(name) })
      .expect(201);
    return res.body.id as string;
  }

  /** Id of a system role (`owner`, `admin`, `member`, `viewer`). */
  async systemRoleId(key: string): Promise<string> {
    const { rows } = await this.db.query<{ id: string }>(
      `SELECT id FROM public.workspace_roles WHERE workspace_id IS NULL AND key = $1`,
      [key],
    );
    return rows[0].id;
  }

  /** Adds a member directly (setup only: bypasses the invitation flow). */
  async addMember(workspaceId: string, userId: string, roleKey: string): Promise<void> {
    await this.db.query(
      `INSERT INTO public.workspace_members (workspace_id, user_id, role_id)
       VALUES ($1, $2, $3)`,
      [workspaceId, userId, await this.systemRoleId(roleKey)],
    );
  }
}
