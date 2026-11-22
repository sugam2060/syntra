import { pgEnum } from 'drizzle-orm/pg-core';

export const permissionEffectEnum = pgEnum('permission_effect', [
  'allow',
  'deny',
]);
