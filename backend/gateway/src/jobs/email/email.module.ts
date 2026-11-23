import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import mailConfig from '../../config/mail.config';
import { EmailProcessor } from './email.processor';
import { EmailProducer } from './email.producer';
import { MailerService } from './mailer.service';
import { EMAIL_QUEUE } from './types';

/** Registers the `email` queue, its producer and the worker that sends mail over SMTP. */
@Module({
  imports: [
    ConfigModule.forFeature(mailConfig),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
  ],
  providers: [EmailProducer, EmailProcessor, MailerService],
  exports: [EmailProducer],
})
export class EmailModule {}
