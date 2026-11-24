import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, SLUG_PATTERN } from '../utils/slug.util';
import { NormaliseSlug } from './normalise-slug.decorator';

/** Body of `POST workspaces`. */
export class CreateWorkspaceDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  /** URL-safe identifier, unique across all workspaces. Reserved words are rejected. */
  @NormaliseSlug()
  @IsString()
  @MinLength(SLUG_MIN_LENGTH)
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, {
    message: 'slug may only contain lowercase letters, digits and single hyphens between them',
  })
  slug!: string;
}
