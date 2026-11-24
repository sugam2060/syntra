export const PG_UNIQUE_VIOLATION = '23505';
export const PG_INSUFFICIENT_PRIVILEGE = '42501';
export const PG_NO_DATA_FOUND = 'P0002';

interface MaybePostgresError {
  code?: unknown;
  message?: unknown;
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

/**
 * The message the database raised (`RAISE EXCEPTION '...'`). Drizzle's own wrapper message is
 * the failed query text, so the driver error in `cause` wins when there is one.
 */
export function getPostgresErrorMessage(error: unknown): string {
  const candidate = error as MaybePostgresError | null;
  const cause = candidate?.cause as MaybePostgresError | undefined;
  if (typeof cause?.message === 'string') return cause.message;
  return typeof candidate?.message === 'string' ? candidate.message : '';
}

export const isUniqueViolation = (error: unknown): boolean =>
  getPostgresErrorCode(error) === PG_UNIQUE_VIOLATION;
