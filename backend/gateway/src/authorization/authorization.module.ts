import { Module } from '@nestjs/common';
import { PermissionGuard } from './guards/permission.guard';
import { PermissionService } from './permission.service';

/** Endpoint-level authorization. `DatabaseModule` is global, so it needs no imports. */
@Module({
  providers: [PermissionService, PermissionGuard],
  exports: [PermissionService, PermissionGuard],
})
export class AuthorizationModule {}
