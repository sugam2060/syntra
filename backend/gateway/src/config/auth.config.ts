import { registerAs } from '@nestjs/config';
import type { AuthConfig } from './types';

export const AUTH_CONFIG_KEY = 'auth';

export default registerAs(
  AUTH_CONFIG_KEY,
  (): AuthConfig => ({
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET as string,
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      issuer: process.env.JWT_ISSUER ?? 'syntra-gateway',
      audience: process.env.JWT_AUDIENCE ?? 'syntra-api',
    },
    refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
    emailVerificationTtlHours: Number(
      process.env.EMAIL_VERIFICATION_TTL_HOURS ?? 24,
    ),
    passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 30),
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackUrl:
        process.env.GOOGLE_CALLBACK_URL ??
        'http://localhost:3000/api/v1/authentication/callback/google',
    },
  }),
);
