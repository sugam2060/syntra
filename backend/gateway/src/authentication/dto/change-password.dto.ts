import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './register.dto';

/** Body of `POST authentication/change-password`. */
export class ChangePasswordDto {
  /** Required when the account already has a password; omit it to add a first password. */
  @IsOptional()
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword?: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}
