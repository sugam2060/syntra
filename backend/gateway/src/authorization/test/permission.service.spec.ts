import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { DatabaseService } from '../../database/database.service';
import { PermissionService } from '../permission.service';

const USER = '0192b1c4-0000-7000-8000-000000000001';
const WORKSPACE = '0192b1c4-0000-7000-8000-0000000000aa';

function build(allowed: boolean | null | 'no-rows') {
  const execute = jest.fn().mockResolvedValue({
    rows: allowed === 'no-rows' ? [] : [{ allowed }],
  });
  const withTenant = jest.fn(async (_ctx: unknown, fn: (tx: unknown) => unknown) =>
    fn({ execute }),
  );
  const service = new PermissionService({ withTenant } as unknown as DatabaseService);
  return { service, execute, withTenant };
}

describe('PermissionService', () => {
  it('asks the database once, inside the tenant context of the caller', async () => {
    const { service, execute, withTenant } = build(true);

    await expect(service.hasAll(USER, WORKSPACE, ['ai:use', 'task:update'])).resolves.toBe(true);

    expect(withTenant).toHaveBeenCalledTimes(1);
    expect(withTenant.mock.calls[0][0]).toEqual({ userId: USER, workspaceId: WORKSPACE });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('delegates to app.has_permission and binds every value as a parameter', async () => {
    const { service, execute } = build(true);
    await service.hasAll(USER, WORKSPACE, ['ai:use', 'task:update']);

    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0] as SQL);
    expect(query.sql).toContain('app.has_permission');
    expect(query.sql).toContain('bool_and');
    expect(query.params).toEqual([WORKSPACE, 'ai:use', 'task:update']);
    expect(query.sql).not.toContain('ai:use');
  });

  it.each([
    ['false', false],
    ['null (no row evaluated)', null],
    ['no rows', 'no-rows' as const],
  ])('denies when the database answers %s', async (_label, answer) => {
    const { service } = build(answer);
    await expect(service.hasAll(USER, WORKSPACE, ['ai:use'])).resolves.toBe(false);
  });

  it('has nothing to check for an empty list and skips the database', async () => {
    const { service, withTenant } = build(false);
    await expect(service.hasAll(USER, WORKSPACE, [])).resolves.toBe(true);
    expect(withTenant).not.toHaveBeenCalled();
  });
});
