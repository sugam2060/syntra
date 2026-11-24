/** A pending invitation can be accepted until it expires; `expired` ones are only waiting to be resent or revoked. */
export type InvitationStatus = 'pending' | 'expired';

/** An open invitation as shown to people who manage members. The token is never included. */
export interface InvitationSummary {
  id: string;
  email: string;
  role: { id: string; key: string; name: string };
  invitedBy: { id: string; name: string | null };
  createdAt: Date;
  expiresAt: Date;
  status: InvitationStatus;
}

export type InviteOutcome = 'invited' | 'already_member' | 'already_invited';

/** Result for one address of a bulk invite. `invitation` is set only when `outcome` is `invited`. */
export interface InviteResult {
  email: string;
  outcome: InviteOutcome;
  invitation: InvitationSummary | null;
}

/** A live invitation addressed to the signed-in user, with the workspace names they cannot read yet. */
export interface MyInvitation {
  id: string;
  workspaceName: string;
  workspaceSlug: string;
  roleName: string;
  inviterName: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export type InvitationPreviewStatus = 'pending' | 'expired' | 'revoked' | 'accepted';

/** What the accept page shows for an emailed token, before or after signing in. */
export interface InvitationPreview {
  workspaceName: string;
  roleName: string;
  inviterName: string | null;
  invitedEmail: string;
  status: InvitationPreviewStatus;
  expiresAt: Date;
}

export interface AcceptedInvitation {
  workspaceId: string;
}

/** Outcome of `app.accept_workspace_invitation`, so the service can choose the HTTP error. */
export type AcceptOutcome =
  | { status: 'accepted'; workspaceId: string }
  | { status: 'invalid' }
  | { status: 'email-not-verified' };

/** An invitation is identified by the emailed token (hashed) or by its id from the in-app list. */
export type InvitationReference = { tokenHash: string } | { invitationId: string };
