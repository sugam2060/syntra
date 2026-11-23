import type { MailMessage, VerificationEmailJob, PasswordResetEmailJob } from './types';

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
): MailMessage {
  const text = [greeting(name), '', intro, '', `${actionLabel}: ${link}`, '', outro].join('\n');
  const html = [
    `<p>${escapeHtml(greeting(name))}</p>`,
    `<p>${escapeHtml(intro)}</p>`,
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
