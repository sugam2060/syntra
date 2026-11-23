import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticationModule } from './authentication/authentication.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { PermissionGuard } from './authorization/guards/permission.guard';
import {
  skipUnlessStrict,
  STRICT_THROTTLER,
} from './common/decorators/strict-throttle.decorator';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/env.validation';
import mailConfig from './config/mail.config';
import redisConfig from './config/redis.config';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './jobs/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, authConfig, databaseConfig, mailConfig, redisConfig],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule.forFeature(appConfig)],
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => [
        { name: 'default', ttl: config.throttle.ttlMs, limit: config.throttle.limit },
        {
          name: STRICT_THROTTLER,
          ttl: config.throttle.ttlMs,
          limit: config.throttle.authLimit,
          skipIf: skipUnlessStrict,
        },
      ],
    }),
    QueueModule,
    DatabaseModule,
    AuthenticationModule,
    AuthorizationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: throttle first so unauthenticated floods are rejected cheaply.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Must come after JwtAuthGuard: it reads the user the JWT guard attached to the request.
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
