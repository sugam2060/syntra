import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Permission, RequiredPermission, WorkspaceId } from '../authorization';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NoApiKey } from '../common/decorators/no-api-key.decorator';
import { StrictThrottle } from '../common/decorators/strict-throttle.decorator';
import type { AuthenticatedUser } from '../common/types';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import type { ApiKeySummary, CreatedApiKey } from './types';

/**
 * Workspace API-key management. Needs `ai:manage_keys` in the workspace and a signed-in user:
 * an API key can never create or revoke keys.
 */
@Controller('workspaces/:workspaceId/api-keys')
@NoApiKey()
@RequiredPermission(Permission.AI_MANAGE_KEYS)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  /** Returns the key in plaintext exactly once. */
  @Post()
  @StrictThrottle()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateApiKeyDto,
  ): Promise<CreatedApiKey> {
    return this.apiKeys.create(user.userId, workspaceId, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
  ): Promise<ApiKeySummary[]> {
    return this.apiKeys.list(user.userId, workspaceId);
  }

  @Delete(':keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @CurrentUser() user: AuthenticatedUser,
    @WorkspaceId() workspaceId: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
  ): Promise<void> {
    return this.apiKeys.revoke(user.userId, workspaceId, keyId);
  }
}
