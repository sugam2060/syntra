import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SLUG_MAX_LENGTH, SLUG_MIN_LENGTH, SLUG_PATTERN } from '../utils/slug.util';
import { NormaliseSlug } from './normalise-slug.decorator';

/** Body of `PATCH workspaces/:workspaceId`. At least one field is required (checked in the service). */
export class UpdateWorkspaceDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @NormaliseSlug()
  @IsString()
  @MinLength(SLUG_MIN_LENGTH)
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, {
    message: 'slug may only contain lowercase letters, digits and single hyphens between them',
  })
  slug?: string;
}
