import { Transform } from 'class-transformer';

/** Trim and lowercase so a slug is always compared and stored in one form. */
export const NormaliseSlug = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
