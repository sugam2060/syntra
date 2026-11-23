import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Controller, Get } from '@nestjs/common';
import {
  Permission,
  REQUIRED_PERMISSION_KEY,
  RequiredPermission,
  WorkspaceId,
} from '../index';

@Controller()
@RequiredPermission(Permission.TASK_READ)
class ProbeController {
  @Get('class-level')
  classLevel(): void {}

  @Get('handler-level')
  @RequiredPermission(Permission.AI_USE, Permission.TASK_UPDATE)
  handlerLevel(): void {}

  @Get('with-workspace')
  withWorkspace(@WorkspaceId() _workspaceId: string): void {}
}

/** The method function without referencing it as an unbound property. */
const method = (name: keyof ProbeController): (() => void) =>
  Object.getOwnPropertyDescriptor(ProbeController.prototype, name)!.value as () => void;

describe('RequiredPermission', () => {
  const reflector = new Reflector();

  it('stores the codes on the handler and the class', () => {
    expect(Reflect.getMetadata(REQUIRED_PERMISSION_KEY, ProbeController)).toEqual([
      'task:read',
    ]);
    expect(
      Reflect.getMetadata(REQUIRED_PERMISSION_KEY, method('handlerLevel')),
    ).toEqual(['ai:use', 'task:update']);
  });

  it('lets the handler value win over the controller value', () => {
    const resolve = (handler: () => void) =>
      reflector.getAllAndOverride(REQUIRED_PERMISSION_KEY, [handler, ProbeController]);

    expect(resolve(method('handlerLevel'))).toEqual(['ai:use', 'task:update']);
    expect(resolve(method('classLevel'))).toEqual(['task:read']);
  });
});

describe('WorkspaceId', () => {
  it('returns the workspace id the guard put on the request', () => {
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      ProbeController,
      'withWorkspace',
    ) as Record<string, { factory: (data: unknown, ctx: unknown) => unknown }>;
    const { factory } = Object.values(metadata)[0];

    const context = {
      switchToHttp: () => ({ getRequest: () => ({ workspaceId: 'ws-1' }) }),
    };
    expect(factory(undefined, context)).toBe('ws-1');
  });
});
