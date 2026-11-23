import { IsEmail, MaxLength } from 'class-validator';
import { NormaliseEmail } from './normalise-email.decorator';

export class ForgotPasswordDto {
  @NormaliseEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
