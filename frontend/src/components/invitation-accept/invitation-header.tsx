import { getInitials } from "@/lib/user-display";
import type { InvitationPreview } from "@/types/shared";

type InvitationHeaderProps = {
  preview: InvitationPreview;
};

/** Workspace avatar, the "who invited you where" headline, and the address the invitation was sent to. */
export function InvitationHeader({ preview }: InvitationHeaderProps) {
  const { workspaceName, inviterName, invitedEmail } = preview;

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
      >
        {getInitials({ name: workspaceName, email: workspaceName })}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-balance break-words text-foreground">
          {inviterName === null
            ? `You're invited to ${workspaceName}`
            : `${inviterName} invited you to ${workspaceName}`}
        </h1>
        <p className="text-sm leading-[21px] break-all text-muted-foreground">
          Sent to {invitedEmail}
        </p>
      </div>
    </div>
  );
}
