import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const MAX_INVITES_PER_REQUEST = 20;

/** Body of `POST workspaces/:workspaceId/invitations`. */
export class InviteMembersDto {
  /** Addresses to invite. They are trimmed and lowercased; duplicates are rejected. */
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item: unknown) => (typeof item === 'string' ? item.trim().toLowerCase() : item))
      : value,
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_INVITES_PER_REQUEST)
  @ArrayUnique()
  @IsEmail({}, { each: true })
  @MaxLength(254, { each: true })
  emails!: string[];

  /** A system role (except `owner`) or a custom role of this workspace. */
  @IsUUID()
  roleId!: string;

  /** Optional personal note included in the email. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  message?: string;
}
