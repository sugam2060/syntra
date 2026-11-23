import { IsString, Length, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './register.dto';

export class ResetPasswordDto {
  @IsString()
  @Length(20, 200)
  token!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
