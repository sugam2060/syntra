import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  buildPasswordResetEmail,
  buildVerificationEmail,
  buildWorkspaceInvitationEmail,
} from './email-templates';
import { MailerService } from './mailer.service';
import {
  EMAIL_QUEUE,
  EmailJobName,
  type PasswordResetEmailJob,
  type VerificationEmailJob,
  type WorkspaceInvitationEmailJob,
} from './types';

/** Worker for the `email` queue. Throwing from `process` makes BullMQ retry per the queue's default job options. */
@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case EmailJobName.Verification:
        await this.mailer.send(buildVerificationEmail(job.data as VerificationEmailJob));
        break;
      case EmailJobName.PasswordReset:
        await this.mailer.send(buildPasswordResetEmail(job.data as PasswordResetEmailJob));
        break;
      case EmailJobName.WorkspaceInvitation:
        await this.mailer.send(
          buildWorkspaceInvitationEmail(job.data as WorkspaceInvitationEmailJob),
        );
        break;
      default:
        // Payloads carry one-time links, so only the job name is logged.
        this.logger.warn(`Ignoring unknown email job "${job.name}"`);
    }
  }
}
