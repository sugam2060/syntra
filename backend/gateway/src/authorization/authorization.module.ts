import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';

/** Endpoint-level authorization. `DatabaseModule` is global, so it needs no imports. */
@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class AuthorizationModule {}
