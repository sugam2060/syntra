import type { Job, Queue } from 'bullmq';
import type { DatabaseService } from '../../../database/database.service';
import { AuthDataPurgeService } from '../auth-data-purge.service';
import { MaintenanceProcessor } from '../maintenance.processor';
import { MaintenanceScheduler } from '../maintenance.scheduler';
import { MaintenanceJobName } from '../types';

const appConfig = {
  port: 3000,
  apiPrefix: 'api/v1',
  frontendUrl: 'http://localhost:3001',
  isProduction: false,
  trustProxy: false,
  maintenance: { authCleanupCron: '15 4 * * *' },
  throttle: { ttlMs: 60_000, limit: 120, authLimit: 10 },
};

describe('AuthDataPurgeService', () => {
  it('turns the database counts (bigint strings) into numbers', async () => {
    const execute = jest.fn().mockResolvedValue({
      rows: [{ sessions_deleted: '4', tokens_deleted: '2', api_keys_deleted: '0' }],
    });
    const service = new AuthDataPurgeService({ db: { execute } } as unknown as DatabaseService);

    await expect(service.purge()).resolves.toEqual({
      sessionsDeleted: 4,
      tokensDeleted: 2,
      apiKeysDeleted: 0,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('reports zeros when nothing comes back', async () => {
    const execute = jest.fn().mockResolvedValue({ rows: [] });
    const service = new AuthDataPurgeService({ db: { execute } } as unknown as DatabaseService);
    await expect(service.purge()).resolves.toEqual({
      sessionsDeleted: 0,
      tokensDeleted: 0,
      apiKeysDeleted: 0,
    });
  });
});

describe('MaintenanceProcessor', () => {
  const result = { sessionsDeleted: 1, tokensDeleted: 2, apiKeysDeleted: 3 };

  it('runs the purge for the purge job and returns the counts', async () => {
    const purge = jest.fn().mockResolvedValue(result);
    const processor = new MaintenanceProcessor({ purge } as unknown as AuthDataPurgeService);

    await expect(
      processor.process({ name: MaintenanceJobName.PurgeExpiredAuthData } as Job),
    ).resolves.toEqual(result);
    expect(purge).toHaveBeenCalledTimes(1);
  });

  it('ignores a job it does not know instead of purging', async () => {
    const purge = jest.fn();
    const processor = new MaintenanceProcessor({ purge } as unknown as AuthDataPurgeService);

    await expect(processor.process({ name: 'something-else' } as Job)).resolves.toBeUndefined();
    expect(purge).not.toHaveBeenCalled();
  });
});

describe('MaintenanceScheduler', () => {
  it('registers one repeatable purge with the configured cron pattern', async () => {
    const upsertJobScheduler = jest.fn().mockResolvedValue(undefined);
    const scheduler = new MaintenanceScheduler(
      { upsertJobScheduler } as unknown as Queue,
      appConfig,
    );

    await scheduler.onModuleInit();

    expect(upsertJobScheduler).toHaveBeenCalledWith(
      MaintenanceJobName.PurgeExpiredAuthData,
      { pattern: '15 4 * * *' },
      expect.objectContaining({ name: MaintenanceJobName.PurgeExpiredAuthData }),
    );
  });

  it('does not crash the application when Redis is unavailable at boot', async () => {
    const upsertJobScheduler = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const scheduler = new MaintenanceScheduler(
      { upsertJobScheduler } as unknown as Queue,
      appConfig,
    );
    await expect(scheduler.onModuleInit()).resolves.toBeUndefined();
  });
});
