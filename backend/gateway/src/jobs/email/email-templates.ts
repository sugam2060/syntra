import type {
  MailMessage,
  PasswordResetEmailJob,
  VerificationEmailJob,
  WorkspaceInvitationEmailJob,
} from './types';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const greeting = (name: string | null): string => (name ? `Hi ${name},` : 'Hi,');

function render(
  to: string,
  subject: string,
  name: string | null,
  intro: string,
  actionLabel: string,
  link: string,
  outro: string,
  note: string | null = null,
): MailMessage {
  const text = [
    greeting(name),
    '',
    intro,
    ...(note ? ['', note] : []),
    '',
    `${actionLabel}: ${link}`,
    '',
    outro,
  ].join('\n');
  const html = [
    `<p>${escapeHtml(greeting(name))}</p>`,
    `<p>${escapeHtml(intro)}</p>`,
    ...(note ? [`<blockquote>${escapeHtml(note)}</blockquote>`] : []),
    `<p><a href="${escapeHtml(link)}">${escapeHtml(actionLabel)}</a></p>`,
    `<p>${escapeHtml(outro)}</p>`,
  ].join('');
  return { to, subject, text, html };
}

/** Plain-text and HTML bodies; every interpolated value is HTML-escaped. */
export function buildVerificationEmail(job: VerificationEmailJob): MailMessage {
  return render(
    job.email,
    'Verify your email address',
    job.name,
    'Confirm your email address to finish setting up your account.',
    'Verify email',
    job.link,
    'If you did not create an account, you can ignore this message.',
  );
}

export function buildPasswordResetEmail(job: PasswordResetEmailJob): MailMessage {
  return render(
    job.email,
    'Reset your password',
    job.name,
    'We received a request to reset your password. The link below is single-use and expires soon.',
    'Reset password',
    job.link,
    'If you did not request this, you can ignore this message; your password will not change.',
  );
}

export function buildWorkspaceInvitationEmail(job: WorkspaceInvitationEmailJob): MailMessage {
  const who = job.inviterName ? `${job.inviterName} invited you` : 'You have been invited';
  const subject = `${who} to join ${job.workspaceName}`;
  const expires = new Date(job.expiresAt).toISOString().slice(0, 10);

  return render(
    job.email,
    subject,
    job.name,
    `${who} to join ${job.workspaceName} as ${job.roleName}.`,
    'Accept invitation',
    job.link,
    `This invitation expires on ${expires} (UTC). Accepting needs a verified account with this email address. If you were not expecting it, you can ignore this message.`,
    job.message,
  );
}
