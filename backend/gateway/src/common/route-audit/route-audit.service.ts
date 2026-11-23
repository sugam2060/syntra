import { Injectable, Logger, OnApplicationBootstrap, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { REQUIRED_PERMISSION_KEY } from '../../authorization/decorators/required-permission.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { findUnprotectedWorkspaceRoutes, joinRoutePath } from './route-audit.util';
import type { RouteInfo } from './types';

type AnyFunction = (...args: never[]) => unknown;

const firstPath = (metadata: unknown): string => {
  const value: unknown = Array.isArray(metadata) ? (metadata as unknown[])[0] : metadata;
  return typeof value === 'string' ? value : '';
};

/**
 * At startup, warns about workspace-scoped routes that carry neither `@RequiredPermission` nor
 * `@Public`. The permission guard is opt-in, so a forgotten decorator silently leaves a route
 * open to every signed-in user.
 */
@Injectable()
export class RouteAuditService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RouteAuditService.name);

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
  ) {}

  onApplicationBootstrap(): void {
    for (const route of this.findUnprotected()) {
      this.logger.warn(
        `${route.httpMethod} ${route.path} (${route.controller}.${route.handler}) is workspace-scoped ` +
          'but has no @RequiredPermission: any signed-in user can call it',
      );
    }
  }

  /** Workspace routes with neither `@RequiredPermission` nor `@Public()`. */
  findUnprotected(): RouteInfo[] {
    return findUnprotectedWorkspaceRoutes(this.collectRoutes());
  }

  /**
   * Every HTTP route of every controller, read from decorator metadata. A class-level
   * `@RequiredPermission` or `@Public()` counts for all its handlers. Paths exclude the global prefix.
   */
  collectRoutes(): RouteInfo[] {
    const routes: RouteInfo[] = [];

    for (const wrapper of this.discovery.getControllers()) {
      const controller = wrapper.metatype;
      const prototype: object | undefined = wrapper.instance
        ? (Object.getPrototypeOf(wrapper.instance) as object)
        : undefined;
      if (!controller || !prototype) continue;

      const basePath = firstPath(Reflect.getMetadata(PATH_METADATA, controller));
      const classPermission = Reflect.getMetadata(REQUIRED_PERMISSION_KEY, controller) !== undefined;
      const classPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller) === true;

      for (const name of this.scanner.getAllMethodNames(prototype)) {
        const handler = (prototype as Record<string, AnyFunction>)[name];
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
        if (method === undefined) continue; // a helper method, not a route

        routes.push({
          controller: controller.name,
          handler: name,
          httpMethod: RequestMethod[method],
          path: joinRoutePath(basePath, firstPath(Reflect.getMetadata(PATH_METADATA, handler))),
          requiresPermission:
            Reflect.getMetadata(REQUIRED_PERMISSION_KEY, handler) !== undefined || classPermission,
          isPublic: Reflect.getMetadata(IS_PUBLIC_KEY, handler) === true || classPublic,
        });
      }
    }
    return routes;
  }
}
