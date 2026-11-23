import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Queue } from 'bullmq';
import appConfig from '../../config/app.config';
import { MAINTENANCE_QUEUE, MaintenanceJobName } from './types';

/**
 * Registers the recurring purge on startup. `upsertJobScheduler` is idempotent, so every
 * instance can call it and only one schedule exists (a changed cron pattern replaces the old
 * one).
 */
@Injectable()
export class MaintenanceScheduler implements OnModuleInit {
  private readonly logger = new Logger(MaintenanceScheduler.name);

  constructor(
    @InjectQueue(MAINTENANCE_QUEUE) private readonly queue: Queue,
    @Inject(appConfig.KEY) private readonly app: ConfigType<typeof appConfig>,
  ) {}

  async onModuleInit(): Promise<void> {
    const pattern = this.app.maintenance.authCleanupCron;
    try {
      await this.queue.upsertJobScheduler(
        MaintenanceJobName.PurgeExpiredAuthData,
        { pattern },
        {
          name: MaintenanceJobName.PurgeExpiredAuthData,
          opts: { removeOnComplete: true, removeOnFail: 100 },
        },
      );
      this.logger.log(`Scheduled expired-data purge (${pattern})`);
    } catch (error) {
      // A Redis hiccup at boot must not take the API down; the schedule is retried on restart.
      this.logger.error(
        `Could not schedule the expired-data purge: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
