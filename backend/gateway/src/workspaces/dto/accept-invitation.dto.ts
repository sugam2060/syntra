import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

/**
 * Body of `POST invitations/accept`. Send exactly one: the `token` from the emailed link, or the
 * `invitationId` of an invitation listed for the signed-in user (checked in the service).
 */
export class AcceptInvitationDto {
  @IsOptional()
  @IsString()
  @Length(20, 200)
  token?: string;

  @IsOptional()
  @IsUUID()
  invitationId?: string;
}

/** Query of `GET invitations/preview`. */
export class PreviewInvitationQueryDto {
  @IsString()
  @Length(20, 200)
  token!: string;
}
