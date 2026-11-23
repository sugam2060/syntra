import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH } from './register.dto';
import { NormaliseEmail } from './normalise-email.decorator';

export class LoginDto {
  @NormaliseEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
