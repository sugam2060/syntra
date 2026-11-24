import { IsString, MaxLength } from 'class-validator';
import { NormaliseSlug } from './normalise-slug.decorator';

/** Query of `GET workspaces/slug-availability`. Format problems are reported in the answer, not as 400. */
export class SlugQueryDto {
  @NormaliseSlug()
  @IsString()
  @MaxLength(100)
  slug!: string;
}
