import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { Permission, RequiredPermission } from '../../src/authorization';
import { Public } from '../../src/common/decorators/public.decorator';
import { RouteAuditService } from '../../src/common/route-audit/route-audit.service';

@Controller('workspaces/:workspaceId/audit-probe')
class AuditProbeController {
  @Get('forgotten')
  forgotten() {
    return { ok: true };
  }

  @Get('protected')
  @RequiredPermission(Permission.TASK_READ)
  protectedRoute() {
    return { ok: true };
  }

  @Public()
  @Get('open')
  open() {
    return { ok: true };
  }

  helper() {
    return 'not a route';
  }
}

@Controller('workspaces/:workspaceId/class-level')
@RequiredPermission(Permission.TASK_READ)
class ClassLevelProbeController {
  @Get()
  list() {
    return { ok: true };
  }
}

describe('Route audit (e2e)', () => {
  const build = async (controllers: Array<new () => unknown> = []): Promise<[INestApplication, RouteAuditService]> => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    return [app, moduleRef.get(RouteAuditService)];
  };

  it('finds no unprotected workspace route in the real application', async () => {
    const [app, audit] = await build();
    try {
      expect(audit.findUnprotected()).toEqual([]);
      // Sanity: it does see the real workspace routes (the API-key management ones).
      const seen = audit.collectRoutes().filter((r) => r.controller === 'ApiKeysController');
      expect(seen.length).toBeGreaterThanOrEqual(3);
      expect(seen.every((r) => r.requiresPermission)).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('flags only the forgotten route, not protected, public, class-protected or helper methods', async () => {
    const [app, audit] = await build([AuditProbeController, ClassLevelProbeController]);
    try {
      const findings = audit.findUnprotected();
      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        controller: 'AuditProbeController',
        handler: 'forgotten',
        httpMethod: 'GET',
        path: '/workspaces/:workspaceId/audit-probe/forgotten',
      });
    } finally {
      await app.close();
    }
  });
});
