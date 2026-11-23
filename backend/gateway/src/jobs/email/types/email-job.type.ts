export const EMAIL_QUEUE = 'email';

export enum EmailJobName {
  Verification = 'send-verification',
  PasswordReset = 'send-password-reset',
}

export interface EmailRecipient {
  email: string;
  name: string | null;
}

export interface VerificationEmailJob extends EmailRecipient {
  /** Fully built link; contains the raw token, so never log it. */
  link: string;
}

export interface PasswordResetEmailJob extends EmailRecipient {
  link: string;
}

export interface EmailJobPayloads {
  [EmailJobName.Verification]: VerificationEmailJob;
  [EmailJobName.PasswordReset]: PasswordResetEmailJob;
}
