"use client";

import { useState } from "react";

import { useWorkspaceRoles } from "@/api/workspaces";
import { InvitePeopleForm } from "@/components/members/invite-people-form";
import { InviteResults } from "@/components/members/invite-results";
import { ListSkeleton } from "@/components/members/list-skeleton";
import { QueryError } from "@/components/members/query-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGrantablePermissions } from "@/hooks/use-grantable-permissions";
import { getAssignableRoles } from "@/lib/role-permissions";
import type { InviteResult } from "@/types/shared";

type InviteDialogProps = {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type InviteDialogBodyProps = {
  workspaceId: string;
};

/** Loads the roles, then shows the form; after sending, the per-address results. Mounted only while the dialog is open, so it starts fresh each time. */
function InviteDialogBody({ workspaceId }: InviteDialogBodyProps) {
  const roles = useWorkspaceRoles(workspaceId);
  const { canGrant, isPending: grantsPending } = useGrantablePermissions();
  const [results, setResults] = useState<InviteResult[] | null>(null);

  if (results) {
    return <InviteResults results={results} />;
  }
  if (roles.isPending || grantsPending) {
    return <ListSkeleton label="roles" rows={3} />;
  }
  if (roles.isError) {
    return <QueryError subject="roles" error={roles.error} onRetry={() => void roles.refetch()} />;
  }

  return (
    <InvitePeopleForm
      workspaceId={workspaceId}
      roles={getAssignableRoles(roles.data)}
      canGrant={canGrant}
      onSent={setResults}
    />
  );
}

/** "Invite people" dialog: emails, role and an optional message, then the result for each address. */
export function InviteDialog({ workspaceId, open, onOpenChange }: InviteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] leading-[22px] font-semibold">
            Invite people
          </DialogTitle>
          <DialogDescription>Send an email invitation to join this workspace.</DialogDescription>
        </DialogHeader>
        {open && <InviteDialogBody workspaceId={workspaceId} />}
      </DialogContent>
    </Dialog>
  );
}
