import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import mailConfig from '../../config/mail.config';
import type { MailMessage } from './types';

/** Thin nodemailer wrapper. Uses implicit TLS only on port 465; auth only when `SMTP_USER` is set. */
@Injectable()
export class MailerService {
  private readonly transporter: Transporter;

  constructor(@Inject(mailConfig.KEY) private readonly config: ConfigType<typeof mailConfig>) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
    });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.config.from, ...message });
  }
}
