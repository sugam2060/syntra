import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from '../../config/app.config';
import { AuthDataPurgeService } from './auth-data-purge.service';
import { MaintenanceProcessor } from './maintenance.processor';
import { MaintenanceScheduler } from './maintenance.scheduler';
import { MAINTENANCE_QUEUE } from './types';

/** Housekeeping jobs. Currently one: the nightly purge of expired authentication data. */
@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    BullModule.registerQueue({ name: MAINTENANCE_QUEUE }),
  ],
  providers: [AuthDataPurgeService, MaintenanceProcessor, MaintenanceScheduler],
  exports: [AuthDataPurgeService],
})
export class MaintenanceModule {}
