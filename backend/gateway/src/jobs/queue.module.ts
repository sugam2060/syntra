import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import redisConfig from '../config/redis.config';

/** Owns the shared BullMQ/Redis connection; feature queues register themselves against it. */
@Global()
@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    BullModule.forRootAsync({
      imports: [ConfigModule.forFeature(redisConfig)],
      inject: [redisConfig.KEY],
      useFactory: (config: ConfigType<typeof redisConfig>) => ({
        connection: { host: config.host, port: config.port, db: config.db },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2_000 },
          removeOnComplete: true,
          removeOnFail: 1_000,
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
