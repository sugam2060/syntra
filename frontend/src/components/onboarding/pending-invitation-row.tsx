"use client";

import { useRouter } from "next/navigation";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useAcceptInvitation, useDeclineInvitation } from "@/api/workspaces";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { workspaceHomePath } from "@/lib/onboarding-paths";
import type { MyInvitation } from "@/types/shared";

const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";

function acceptErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403 && error.code === EMAIL_NOT_VERIFIED_CODE) {
      return "Verify your email to accept this invitation.";
    }
    if (error.status === 400) {
      return "This invitation is no longer valid.";
    }
    if (error.status === 429) {
      return "Too many attempts. Try again in a minute.";
    }
  }
  return "Couldn't accept the invitation. Try again.";
}

type PendingInvitationRowProps = {
  invitation: MyInvitation;
  /** The signed-in user's email, shown as the address the invitation is for. */
  email: string | undefined;
};

/** A highlighted row for one live invitation, with Accept and Decline. */
export function PendingInvitationRow({
  invitation,
  email,
}: PendingInvitationRowProps) {
  const router = useRouter();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();
  const isBusy = accept.isPending || decline.isPending;

  function handleAccept(): void {
    accept.mutate(invitation.id, {
      onSuccess: () => {
        toast.success(`You joined ${invitation.workspaceName}`);
        router.replace(workspaceHomePath(invitation.workspaceSlug));
      },
      onError: (error) => toast.error(acceptErrorMessage(error)),
    });
  }

  function handleDecline(): void {
    decline.mutate(invitation.id, {
      onSuccess: () => toast.success("Invitation declined"),
      onError: () =>
        toast.error("Couldn't decline the invitation. Try again."),
    });
  }

  return (
    <div className="flex flex-col justify-between gap-4 rounded-card border border-primary/25 bg-accent p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
            {invitation.workspaceName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-sm leading-5 font-medium text-foreground">
            {invitation.workspaceName} invited you as {invitation.roleName}
          </span>
          <span className="text-xs leading-[18px] text-muted-foreground">
            {email
              ? `Pending invitation for ${email}`
              : "Pending invitation"}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isBusy}
          onClick={handleDecline}
          className="h-8 px-3 text-xs text-muted-foreground hover:bg-background hover:text-foreground"
        >
          {decline.isPending ? "Declining" : "Decline"}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isBusy}
          onClick={handleAccept}
          className="h-8 px-4 text-xs hover:bg-primary-hover"
        >
          {accept.isPending ? (
            <>
              <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              Accepting
            </>
          ) : (
            "Accept"
          )}
        </Button>
      </div>
    </div>
  );
}
