import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { AppModule } from '../../src/app.module';
import { AuthDataPurgeService } from '../../src/jobs/maintenance/auth-data-purge.service';
import { WorkspaceFixture } from '../authorization/helpers/workspace-fixture';

/** The purge removes only what the retention rules say, and never live or reuse-detection data. */
describe('Expired authentication data purge', () => {
  const fixture = new WorkspaceFixture();
  const tag = randomUUID().slice(0, 8);
  let app: INestApplication;
  let purger: AuthDataPurgeService;
  let db: Client;

  const exists = async (table: string, column: string, value: string) =>
    (await db.query(`SELECT 1 FROM public.${table} WHERE ${column} = $1`, [value])).rowCount === 1;

  const session = (suffix: string, expires: string, revoked: string | null = null) =>
    db.query(
      `INSERT INTO public.sessions (user_id, refresh_token_hash, expires_at, revoked_at)
       VALUES ($1, $2, now() + $3::interval, CASE WHEN $4::text IS NULL THEN NULL ELSE now() + $4::interval END)`,
      [fixture.ids.member, `${tag}-s-${suffix}`, expires, revoked],
    );

  const token = (suffix: string, expires: string, consumed: string | null = null) =>
    db.query(
      `INSERT INTO public.verification_tokens (user_id, type, token_hash, expires_at, consumed_at)
       VALUES ($1, 'email_verification', $2, now() + $3::interval,
               CASE WHEN $4::text IS NULL THEN NULL ELSE now() + $4::interval END)`,
      [fixture.ids.member, `${tag}-t-${suffix}`, expires, consumed],
    );

  const key = (suffix: string, expires: string | null, revoked: string | null) =>
    db.query(
      `INSERT INTO public.api_keys (workspace_id, created_by, name, key_prefix, key_hash, permissions, expires_at, revoked_at)
       VALUES ($1, $2, 'k', 'sk_xxxxxxxx', $3, ARRAY['ai:use'],
               CASE WHEN $4::text IS NULL THEN NULL ELSE now() + $4::interval END,
               CASE WHEN $5::text IS NULL THEN NULL ELSE now() + $5::interval END)`,
      [fixture.workspaceId, fixture.ids.owner, `${tag}-k-${suffix}`, expires, revoked],
    );

  beforeAll(async () => {
    await fixture.setUp();
    db = new Client({
      connectionString: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await db.connect();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    purger = moduleRef.get(AuthDataPurgeService);
  });

  afterAll(async () => {
    await app.close();
    await db.end();
    await fixture.tearDown();
  });

  it('deletes expired data and keeps everything still needed', async () => {
    // sessions
    await session('expired-2d', '-2 days');
    await session('expired-1h', '-1 hour');
    await session('live', '30 days');
    await session('revoked-still-valid', '30 days', '-3 days');
    // verification tokens
    await token('expired-8d', '-8 days');
    await token('consumed-8d', '1 day', '-8 days');
    await token('expired-1d', '-1 day');
    await token('pending', '1 day');
    // api keys
    await key('revoked-91d', null, '-91 days');
    await key('expired-91d', '-91 days', null);
    await key('revoked-yesterday', null, '-1 day');
    await key('active', null, null);

    const result = await purger.purge();

    expect(result.sessionsDeleted).toBeGreaterThanOrEqual(1);
    expect(result.tokensDeleted).toBeGreaterThanOrEqual(2);
    expect(result.apiKeysDeleted).toBeGreaterThanOrEqual(2);

    // gone
    expect(await exists('sessions', 'refresh_token_hash', `${tag}-s-expired-2d`)).toBe(false);
    expect(await exists('verification_tokens', 'token_hash', `${tag}-t-expired-8d`)).toBe(false);
    expect(await exists('verification_tokens', 'token_hash', `${tag}-t-consumed-8d`)).toBe(false);
    expect(await exists('api_keys', 'key_hash', `${tag}-k-revoked-91d`)).toBe(false);
    expect(await exists('api_keys', 'key_hash', `${tag}-k-expired-91d`)).toBe(false);

    // kept: recently expired, live, and revoked-but-unexpired (reuse detection still needs it)
    expect(await exists('sessions', 'refresh_token_hash', `${tag}-s-expired-1h`)).toBe(true);
    expect(await exists('sessions', 'refresh_token_hash', `${tag}-s-live`)).toBe(true);
    expect(await exists('sessions', 'refresh_token_hash', `${tag}-s-revoked-still-valid`)).toBe(true);
    expect(await exists('verification_tokens', 'token_hash', `${tag}-t-expired-1d`)).toBe(true);
    expect(await exists('verification_tokens', 'token_hash', `${tag}-t-pending`)).toBe(true);
    expect(await exists('api_keys', 'key_hash', `${tag}-k-revoked-yesterday`)).toBe(true);
    expect(await exists('api_keys', 'key_hash', `${tag}-k-active`)).toBe(true);
  });

  it('is idempotent: a second run has nothing of ours left to delete', async () => {
    await purger.purge();
    const again = await purger.purge();
    expect(again).toEqual({ sessionsDeleted: 0, tokensDeleted: 0, apiKeysDeleted: 0 });
  });

  it('is not callable as a normal user query: the application role can only run the function', async () => {
    // app_user has no DELETE path to other users' sessions except through this function.
    const appClient = new Client({ connectionString: process.env.DATABASE_URL });
    await appClient.connect();
    try {
      const direct = await appClient.query(`DELETE FROM public.sessions WHERE expires_at < now()`);
      expect(direct.rowCount).toBe(0); // RLS hides every row without a user context
    } finally {
      await appClient.end();
    }
  });
});
