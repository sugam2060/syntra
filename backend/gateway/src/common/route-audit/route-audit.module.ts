import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { RouteAuditService } from './route-audit.service';

/** Startup check that every workspace-scoped route declares a permission. See `RouteAuditService`. */
@Module({
  imports: [DiscoveryModule],
  providers: [RouteAuditService],
  exports: [RouteAuditService],
})
export class RouteAuditModule {}
