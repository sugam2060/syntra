import { IsEmail, MaxLength } from 'class-validator';
import { NormaliseEmail } from './normalise-email.decorator';

export class ResendVerificationDto {
  @NormaliseEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
