import { Module } from '@nestjs/common';
import { ConfigModule, type ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ApiKeyGuard } from './api-keys/guards/api-key.guard';
import { AuthenticationModule } from './authentication/authentication.module';
import { AuthorizationModule } from './authorization/authorization.module';
import {
  skipUnlessStrict,
  STRICT_THROTTLER,
} from './common/decorators/strict-throttle.decorator';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionGuard } from './common/guards/permission.guard';
import { RouteAuditModule } from './common/route-audit/route-audit.module';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/env.validation';
import mailConfig from './config/mail.config';
import redisConfig from './config/redis.config';
import workspaceConfig from './config/workspace.config';
import { DatabaseModule } from './database/database.module';
import { MaintenanceModule } from './jobs/maintenance/maintenance.module';
import { QueueModule } from './jobs/queue.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, authConfig, databaseConfig, mailConfig, redisConfig, workspaceConfig],
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
    MaintenanceModule,
    DatabaseModule,
    AuthenticationModule,
    AuthorizationModule,
    ApiKeysModule,
    WorkspacesModule,
    RouteAuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Order matters: throttle first so unauthenticated floods are rejected cheaply, then API
    // keys (sk_ tokens), then JWT for everything else, and only then permission checks.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Must come last: it reads the user attached by the API-key or JWT guard.
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
