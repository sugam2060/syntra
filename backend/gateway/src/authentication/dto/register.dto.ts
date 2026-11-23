import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { NormaliseEmail } from './normalise-email.decorator';

export const PASSWORD_MIN_LENGTH = 10;
/** Upper bound keeps argon2 from being used as a CPU-exhaustion vector. */
export const PASSWORD_MAX_LENGTH = 128;

export class RegisterDto {
  @NormaliseEmail()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}
