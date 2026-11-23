/**
 * Raw `db.execute()` results (SQL functions, hand-written queries) come back with timestamps as
 * ISO strings, unlike query-builder results which are `Date` objects. Normalise at the boundary.
 */
export function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value : new Date(value);
}
