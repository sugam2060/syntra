import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { EmailProducer } from '../../src/jobs/email/email.producer';

const PREFIX = '/api/v1/authentication';
const CLIENT_IP = '203.0.113.7';

describe('TRUST_PROXY (e2e)', () => {
  const runId = randomUUID().slice(0, 8);
  const password = 'correct-horse-battery';
  let owner: Client;

  beforeAll(async () => {
    owner = new Client({
      connectionString: process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL,
    });
    await owner.connect();
  });

  afterAll(async () => {
    await owner.query(`DELETE FROM public.users WHERE email LIKE $1`, [`proxy-${runId}-%`]);
    await owner.end();
  });

  async function loginThrough(trustProxy: string, name: string): Promise<string | null> {
    process.env.TRUST_PROXY = trustProxy;
    Object.assign(process.env, { THROTTLE_LIMIT: '1000', AUTH_THROTTLE_LIMIT: '1000' });
    const sent: { email: string; link: string }[] = [];
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailProducer)
      .useValue({
        sendVerification: async (job: { email: string; link: string }) => void sent.push(job),
        sendPasswordReset: async () => undefined,
      })
      .compile();
    const app: INestApplication = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    try {
      const email = `proxy-${runId}-${name}@test.local`;
      const server = app.getHttpServer();
      await request(server).post(`${PREFIX}/register`).send({ email, password, name }).expect(201);
      const token = new URL(sent[0].link).searchParams.get('token');
      await request(server).post(`${PREFIX}/verify-email`).send({ token }).expect(204);
      await request(server)
        .post(`${PREFIX}/login`)
        .set('X-Forwarded-For', CLIENT_IP)
        .send({ email, password })
        .expect(200);

      const { rows } = await owner.query<{ ip: string | null }>(
        `SELECT host(s.ip) AS ip FROM public.sessions s JOIN public.users u ON u.id = s.user_id WHERE u.email = $1`,
        [email],
      );
      return rows[0]?.ip ?? null;
    } finally {
      await app.close();
      delete process.env.TRUST_PROXY;
    }
  }

  it('records the real client address from X-Forwarded-For when one proxy is trusted', async () => {
    await expect(loginThrough('1', 'trusted')).resolves.toBe(CLIENT_IP);
  });

  it('ignores a client-supplied X-Forwarded-For when no proxy is trusted (the default)', async () => {
    const ip = await loginThrough('false', 'untrusted');
    expect(ip).not.toBe(CLIENT_IP);
    expect(ip).toMatch(/127\.0\.0\.1|::1/);
  });
});
