export const EMAIL_QUEUE = 'email';

export enum EmailJobName {
  Verification = 'send-verification',
  PasswordReset = 'send-password-reset',
  WorkspaceInvitation = 'send-workspace-invitation',
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

export interface WorkspaceInvitationEmailJob extends EmailRecipient {
  /** Fully built accept link; contains the raw token, so never log it. */
  link: string;
  workspaceName: string;
  /** Display name of the person who invited; `null` falls back to a neutral wording. */
  inviterName: string | null;
  roleName: string;
  /** Optional personal note from the inviter. */
  message: string | null;
  /** ISO 8601 timestamp (the payload is stored as JSON, so it cannot be a `Date`). */
  expiresAt: string;
}

export interface EmailJobPayloads {
  [EmailJobName.Verification]: VerificationEmailJob;
  [EmailJobName.PasswordReset]: PasswordResetEmailJob;
  [EmailJobName.WorkspaceInvitation]: WorkspaceInvitationEmailJob;
}
