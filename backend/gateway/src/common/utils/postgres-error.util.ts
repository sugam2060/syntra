export const PG_UNIQUE_VIOLATION = '23505';
export const PG_INSUFFICIENT_PRIVILEGE = '42501';

interface MaybePostgresError {
  code?: unknown;
  cause?: unknown;
}

/**
 * Drizzle wraps driver errors in `DrizzleQueryError` and keeps the original in `cause`,
 * so the SQLSTATE can live on the error itself or one level down.
 */
export function getPostgresErrorCode(error: unknown): string | undefined {
  const candidate = error as MaybePostgresError | null;
  if (typeof candidate?.code === 'string') return candidate.code;
  const cause = candidate?.cause as MaybePostgresError | undefined;
  return typeof cause?.code === 'string' ? cause.code : undefined;
}

export const isUniqueViolation = (error: unknown): boolean =>
  getPostgresErrorCode(error) === PG_UNIQUE_VIOLATION;
