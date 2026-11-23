import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyGuard } from './guards/api-key.guard';

/**
 * Workspace API keys: management endpoints plus `ApiKeyGuard`, which authenticates `sk_` Bearer
 * tokens. The guard is registered globally in `AppModule`, not here.
 */
@Module({
  imports: [AuthorizationModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeysRepository, ApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard],
})
export class ApiKeysModule {}
