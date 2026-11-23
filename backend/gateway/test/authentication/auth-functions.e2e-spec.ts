import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client, Pool } from 'pg';

/**
 * Integration tests for the SECURITY DEFINER functions behind refresh rotation, token
 * consumption and OAuth sign-up. They connect as the non-owner `app_user` (RLS enforced).
 */
describe('Authentication SQL functions', () => {
  const runId = randomUUID().slice(0, 8);
  const email = (name: string) => `authfn-${runId}-${name}@test.local`;
  const hour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

  let app: Pool;
  let owner: Client;

  const createUser = async (name: string): Promise<string> => {
    const { rows } = await app.query<{ id: string }>(
      `SELECT app.auth_create_user($1, $2, 'hash', true) AS id`,
      [email(name), name],
    );
    return rows[0].id;
  };

  const insertSession = async (userId: string, hash: string, expires = hour()) => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId]);
      await client.query(
        `INSERT INTO public.sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, hash, expires],
      );
      await client.query('COMMIT');
    } finally {
      await client.end();
    }
  };

  const rotate = async (oldHash: string, newHash: string) => {
    const { rows } = await app.query<{ user_id: string | null; status: string }>(
      `SELECT * FROM app.auth_rotate_session($1, $2, $3::timestamptz, 'jest', '127.0.0.1'::inet)`,
      [oldHash, newHash, hour()],
    );
    return rows[0];
  };

  const sessionState = async (hash: string) => {
    const { rows } = await owner.query<{ revoked: boolean }>(
      `SELECT revoked_at IS NOT NULL AS revoked FROM public.sessions WHERE refresh_token_hash = $1`,
      [hash],
    );
    return rows[0];
  };

  beforeAll(async () => {
    app = new Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
    owner = new Client({
      connectionString: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await owner.connect();
  });

  afterAll(async () => {
    await owner.query(`DELETE FROM public.users WHERE email LIKE $1`, [`authfn-${runId}-%`]);
    await owner.end();
    await app.end();
  });

  describe('app.auth_rotate_session', () => {
    it('rotates an active session exactly once', async () => {
      const userId = await createUser('rotate');
      await insertSession(userId, `${runId}-a`);

      const result = await rotate(`${runId}-a`, `${runId}-b`);

      expect(result).toEqual({ user_id: userId, status: 'ok' });
      expect((await sessionState(`${runId}-a`)).revoked).toBe(true);
      expect((await sessionState(`${runId}-b`)).revoked).toBe(false);
    });

    it('treats reuse of a rotated token as theft and revokes every session of the user', async () => {
      const userId = await createUser('reuse');
      await insertSession(userId, `${runId}-r1`);
      await rotate(`${runId}-r1`, `${runId}-r2`);

      const replay = await rotate(`${runId}-r1`, `${runId}-r3`);

      expect(replay).toEqual({ user_id: userId, status: 'reuse' });
      expect((await sessionState(`${runId}-r2`)).revoked).toBe(true);
      expect(await sessionState(`${runId}-r3`)).toBeUndefined();
    });

    it('does not touch other users when one user is compromised', async () => {
      const a = await createUser('victim');
      const b = await createUser('bystander');
      await insertSession(a, `${runId}-v1`);
      await insertSession(b, `${runId}-bystander`);
      await rotate(`${runId}-v1`, `${runId}-v2`);
      await rotate(`${runId}-v1`, `${runId}-v3`);

      expect((await sessionState(`${runId}-bystander`)).revoked).toBe(false);
    });

    it('rejects unknown and expired tokens', async () => {
      const userId = await createUser('expired');
      await insertSession(userId, `${runId}-old`, new Date(Date.now() - 1000).toISOString());

      expect((await rotate(`${runId}-nope`, `${runId}-x`)).status).toBe('invalid');
      expect((await rotate(`${runId}-old`, `${runId}-y`)).status).toBe('invalid');
    });

    it('rejects a session of a deactivated user', async () => {
      const userId = await createUser('inactive');
      await insertSession(userId, `${runId}-in1`);
      await owner.query(`UPDATE public.users SET is_active = false WHERE id = $1`, [userId]);

      expect((await rotate(`${runId}-in1`, `${runId}-in2`)).status).toBe('invalid');
    });
  });

  describe('app.auth_revoke_session', () => {
    it('revokes an active session once', async () => {
      const userId = await createUser('logout');
      await insertSession(userId, `${runId}-lo`);
      const revoke = async () =>
        (await app.query<{ ok: boolean }>(`SELECT app.auth_revoke_session($1) AS ok`, [`${runId}-lo`]))
          .rows[0].ok;

      await expect(revoke()).resolves.toBe(true);
      await expect(revoke()).resolves.toBe(false);
    });
  });

  describe('token functions', () => {
    const insertToken = async (userId: string, hash: string, type: string, expires = hour()) => {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId]);
        await client.query(
          `INSERT INTO public.verification_tokens (user_id, type, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
          [userId, type, hash, expires],
        );
        await client.query('COMMIT');
      } finally {
        await client.end();
      }
    };

    it('consumes a token exactly once even when two requests race', async () => {
      const userId = await createUser('race');
      await insertToken(userId, `${runId}-tok`, 'email_verification');

      const results = await Promise.all(
        [0, 1, 2, 3].map(() =>
          app.query<{ user_id: string | null }>(
            `SELECT app.auth_consume_token('email_verification', $1) AS user_id`,
            [`${runId}-tok`],
          ),
        ),
      );

      const winners = results.map((r) => r.rows[0].user_id).filter((id) => id !== null);
      expect(winners).toEqual([userId]);
    });

    it('does not consume a token of the wrong type or an expired one', async () => {
      const userId = await createUser('wrongtype');
      await insertToken(userId, `${runId}-typed`, 'password_reset');
      await insertToken(userId, `${runId}-stale`, 'email_verification', new Date(Date.now() - 1000).toISOString());

      const consume = async (type: string, hash: string) =>
        (await app.query<{ user_id: string | null }>(`SELECT app.auth_consume_token($1, $2) AS user_id`, [type, hash]))
          .rows[0].user_id;

      await expect(consume('email_verification', `${runId}-typed`)).resolves.toBeNull();
      await expect(consume('email_verification', `${runId}-stale`)).resolves.toBeNull();
    });

    it('creates a reset token for a known email and supersedes the earlier one', async () => {
      const userId = await createUser('reset');
      const create = (hash: string) =>
        app.query(`SELECT * FROM app.auth_create_reset_token($1, $2, $3::timestamptz)`, [
          email('RESET'),
          hash,
          hour(),
        ]);

      const first = await create(`${runId}-rs1`);
      expect(first.rows[0]).toMatchObject({ user_id: userId });
      await create(`${runId}-rs2`);

      const stale = await app.query<{ user_id: string | null }>(
        `SELECT app.auth_consume_token('password_reset', $1) AS user_id`,
        [`${runId}-rs1`],
      );
      const fresh = await app.query<{ user_id: string | null }>(
        `SELECT app.auth_consume_token('password_reset', $1) AS user_id`,
        [`${runId}-rs2`],
      );
      expect(stale.rows[0].user_id).toBeNull();
      expect(fresh.rows[0].user_id).toBe(userId);
    });

    it('returns no row for an unknown email', async () => {
      const result = await app.query(
        `SELECT * FROM app.auth_create_reset_token($1, $2, $3::timestamptz)`,
        [email('ghost'), `${runId}-ghost`, hour()],
      );
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('app.auth_create_oauth_user', () => {
    it('creates a verified user and its linked account atomically', async () => {
      const { rows } = await app.query<{ id: string }>(
        `SELECT app.auth_create_oauth_user($1, 'Ada', NULL, 'google', $2) AS id`,
        [email('oauth'), `g-${runId}`],
      );
      const userId = rows[0].id;

      const user = await owner.query(`SELECT email_verified_at FROM public.users WHERE id = $1`, [userId]);
      const link = await owner.query(
        `SELECT provider::text AS provider, access_token FROM public.oauth_accounts WHERE user_id = $1`,
        [userId],
      );
      expect(user.rows[0].email_verified_at).not.toBeNull();
      expect(link.rows[0]).toEqual({ provider: 'google', access_token: null });

      const found = await app.query(`SELECT * FROM app.auth_find_oauth_account('google', $1)`, [`g-${runId}`]);
      expect(found.rows[0]).toMatchObject({ user_id: userId, is_active: true });
    });

    it('rolls back the user when the provider account already exists', async () => {
      await app.query(`SELECT app.auth_create_oauth_user($1, 'A', NULL, 'google', $2)`, [
        email('dup1'),
        `g-dup-${runId}`,
      ]);
      await expect(
        app.query(`SELECT app.auth_create_oauth_user($1, 'B', NULL, 'google', $2)`, [
          email('dup2'),
          `g-dup-${runId}`,
        ]),
      ).rejects.toMatchObject({ code: '23505' });

      const orphan = await owner.query(`SELECT 1 FROM public.users WHERE email = $1`, [email('dup2')]);
      expect(orphan.rows).toHaveLength(0);
    });
  });

  describe('row level security on sessions', () => {
    it('hides one user\'s sessions from another user and from anonymous queries', async () => {
      const a = await createUser('owner-a');
      const b = await createUser('owner-b');
      await insertSession(a, `${runId}-private`);

      const read = async (userId: string | null) => {
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        await client.connect();
        try {
          await client.query('BEGIN');
          await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId ?? '']);
          const { rows } = await client.query(
            `SELECT 1 FROM public.sessions WHERE refresh_token_hash = $1`,
            [`${runId}-private`],
          );
          await client.query('ROLLBACK');
          return rows.length;
        } finally {
          await client.end();
        }
      };

      await expect(read(a)).resolves.toBe(1);
      await expect(read(b)).resolves.toBe(0);
      await expect(read(null)).resolves.toBe(0);
    });
  });
});
