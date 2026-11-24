"use client";

import { PendingInvitationRow } from "@/components/onboarding/pending-invitation-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MyInvitation } from "@/types/shared";

type PendingInvitationsProps = {
  invitations: MyInvitation[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  email: string | undefined;
};

/** The invitations waiting for this user, or a skeleton or retry while they load. Renders nothing when there are none. */
export function PendingInvitations({
  invitations,
  isPending,
  isError,
  onRetry,
  email,
}: PendingInvitationsProps) {
  if (isPending) {
    return (
      <Skeleton aria-hidden="true" className="h-[70px] rounded-card" />
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 text-sm text-muted-foreground"
      >
        <span>Couldn&apos;t load your invitations.</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-3">
      {invitations.map((invitation) => (
        <li key={invitation.id}>
          <PendingInvitationRow invitation={invitation} email={email} />
        </li>
      ))}
    </ul>
  );
}
