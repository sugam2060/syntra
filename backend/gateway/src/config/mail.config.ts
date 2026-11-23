import { registerAs } from '@nestjs/config';
import type { MailConfig } from './types';

export const MAIL_CONFIG_KEY = 'mail';

export default registerAs(
  MAIL_CONFIG_KEY,
  (): MailConfig => ({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: Number(process.env.SMTP_PORT ?? 1025),
    user: process.env.SMTP_USER || undefined,
    password: process.env.SMTP_PASSWORD || undefined,
    from: process.env.MAIL_FROM ?? 'Syntra <no-reply@syntra.local>',
  }),
);
