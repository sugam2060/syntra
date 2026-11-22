import { pgEnum } from 'drizzle-orm/pg-core';

export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'github']);

export const verificationTokenTypeEnum = pgEnum('verification_token_type', [
  'email_verification',
  'password_reset',
]);
