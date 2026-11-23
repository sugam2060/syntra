import { ExecutionContext, SetMetadata } from '@nestjs/common';

export const STRICT_THROTTLER = 'auth';
export const STRICT_THROTTLE_KEY = 'strictThrottle';

/**
 * Opts a route (or controller) into the tighter `auth` throttler. Every route is covered by
 * the `default` throttler; the strict one only applies where this decorator is present.
 */
export const StrictThrottle = () => SetMetadata(STRICT_THROTTLE_KEY, true);

/**
 * `skipIf` for the `auth` throttler: skip unless the handler or its controller carries
 * `@StrictThrottle()`. Reads the metadata directly because it runs outside dependency injection.
 */
export const skipUnlessStrict = (context: ExecutionContext): boolean => {
  const marked =
    Reflect.getMetadata(STRICT_THROTTLE_KEY, context.getHandler()) ??
    Reflect.getMetadata(STRICT_THROTTLE_KEY, context.getClass());
  return marked !== true;
};
