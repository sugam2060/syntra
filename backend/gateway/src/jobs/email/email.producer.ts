import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  EMAIL_QUEUE,
  EmailJobName,
  type PasswordResetEmailJob,
  type VerificationEmailJob,
} from './types';

/** Enqueues transactional mail. Delivery, retries and backoff happen in the processor. */
@Injectable()
export class EmailProducer {
  constructor(@InjectQueue(EMAIL_QUEUE) private readonly queue: Queue) {}

  async sendVerification(job: VerificationEmailJob): Promise<void> {
    await this.queue.add(EmailJobName.Verification, job);
  }

  async sendPasswordReset(job: PasswordResetEmailJob): Promise<void> {
    await this.queue.add(EmailJobName.PasswordReset, job);
  }
}
