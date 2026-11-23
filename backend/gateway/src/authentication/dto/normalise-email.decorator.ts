import { Transform } from 'class-transformer';

/** Trim and lowercase so lookups and the unique index agree on the same form. */
export const NormaliseEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
