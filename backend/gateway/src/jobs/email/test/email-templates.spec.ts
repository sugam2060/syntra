import {
  buildPasswordResetEmail,
  buildVerificationEmail,
  buildWorkspaceInvitationEmail,
} from '../email-templates';
import type { WorkspaceInvitationEmailJob } from '../types';

const invitation = (over: Partial<WorkspaceInvitationEmailJob> = {}): WorkspaceInvitationEmailJob => ({
  email: 'new@example.com',
  name: null,
  link: 'http://localhost:3001/invitations/accept?token=abc_DEF-123',
  workspaceName: 'Acme',
  inviterName: 'Ada',
  roleName: 'Member',
  message: null,
  expiresAt: '2026-12-01T10:00:00.000Z',
  ...over,
});

describe('buildWorkspaceInvitationEmail', () => {
  it('addresses the invitee and names the workspace, inviter and role', () => {
    const mail = buildWorkspaceInvitationEmail(invitation());

    expect(mail.to).toBe('new@example.com');
    expect(mail.subject).toBe('Ada invited you to join Acme');
    expect(mail.text).toContain('Ada invited you to join Acme as Member');
    expect(mail.html).toContain('Ada invited you to join Acme as Member');
  });

  it('puts the accept link in both the text and the HTML body', () => {
    const mail = buildWorkspaceInvitationEmail(invitation());

    expect(mail.text).toContain('Accept invitation: http://localhost:3001/invitations/accept?token=abc_DEF-123');
    expect(mail.html).toContain('href="http://localhost:3001/invitations/accept?token=abc_DEF-123"');
  });

  it('states when the invitation expires', () => {
    const mail = buildWorkspaceInvitationEmail(invitation());

    expect(mail.text).toContain('2026-12-01');
  });

  it('falls back to a neutral subject when the inviter has no name', () => {
    const mail = buildWorkspaceInvitationEmail(invitation({ inviterName: null }));

    expect(mail.subject).toBe('You have been invited to join Acme');
    expect(mail.text).toContain('You have been invited to join Acme as Member');
  });

  it('includes the personal message when there is one', () => {
    const mail = buildWorkspaceInvitationEmail(invitation({ message: 'Welcome aboard!' }));

    expect(mail.text).toContain('Welcome aboard!');
    expect(mail.html).toContain('Welcome aboard!');
  });

  it('escapes every user-supplied value in the HTML body', () => {
    const mail = buildWorkspaceInvitationEmail(
      invitation({
        workspaceName: '<script>alert(1)</script>',
        inviterName: '"><img src=x>',
        roleName: "R&D's",
        message: '<b>hi</b>',
      }),
    );

    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img');
    expect(mail.html).not.toContain('<b>hi</b>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('R&amp;D&#39;s');
  });
});

describe('existing templates keep their shape', () => {
  it('verification and password reset still render a link', () => {
    const link = 'http://localhost:3001/verify-email?token=t';
    expect(buildVerificationEmail({ email: 'a@b.c', name: 'A', link }).text).toContain(link);
    expect(buildPasswordResetEmail({ email: 'a@b.c', name: null, link }).html).toContain(link);
  });
});
