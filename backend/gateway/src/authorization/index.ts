export * from './authorization.module';
export * from './decorators/required-permission.decorator';
export * from './decorators/workspace-id.decorator';
export * from './guards/permission.guard';
export * from './permission.service';
export * from './types';
export {
  Permission,
  PERMISSION_KEYS,
  type PermissionKey,
} from '../database/schemas/workspace/permission-keys';
