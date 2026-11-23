import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AuthDataPurgeService } from './auth-data-purge.service';
import { MAINTENANCE_QUEUE, MaintenanceJobName, type PurgeResult } from './types';

/** One maintenance job at a time: a purge must never overlap another purge. */
@Processor(MAINTENANCE_QUEUE, { concurrency: 1 })
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(private readonly purger: AuthDataPurgeService) {
    super();
  }

  async process(job: Job): Promise<PurgeResult | undefined> {
    if (job.name !== (MaintenanceJobName.PurgeExpiredAuthData as string)) {
      this.logger.warn(`Ignoring unknown maintenance job "${job.name}"`);
      return undefined;
    }

    const result = await this.purger.purge();
    // Counts only: purged rows contain token hashes and addresses that must not reach logs.
    this.logger.log(
      `Purged ${result.sessionsDeleted} sessions, ${result.tokensDeleted} tokens, ` +
        `${result.apiKeysDeleted} API keys`,
    );
    return result;
  }
}
