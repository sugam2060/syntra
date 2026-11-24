"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuLoaderCircle, LuLogOut } from "react-icons/lu";
import { toast } from "sonner";

import { useLeaveWorkspace } from "@/api/workspaces";
import { AuthBanner } from "@/components/shared/auth-banner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { workspaceActionStatusFromError } from "@/lib/workspace-action-status";
import { useWorkspace } from "@/providers/workspace-provider";
import { AUTH_BANNER_VARIANT } from "@/types/shared";
import type { WorkspaceActionStatus } from "@/types/workspace-settings";

const IDLE: WorkspaceActionStatus = { kind: "idle" };

const DESTRUCTIVE_OUTLINE =
  "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/40 dark:bg-transparent dark:hover:bg-destructive/15";

/** The dialog body. It only exists while the dialog is open, so an earlier error never lingers. */
function LeaveWorkspaceForm() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const leaveWorkspace = useLeaveWorkspace(workspace.id);
  const [status, setStatus] = useState<WorkspaceActionStatus>(IDLE);
  const isBusy = leaveWorkspace.isPending || leaveWorkspace.isSuccess;

  async function handleLeave(): Promise<void> {
    setStatus(IDLE);
    try {
      await leaveWorkspace.mutateAsync();
      toast.success(`You left ${workspace.name}`);
      router.replace("/");
    } catch (error: unknown) {
      setStatus(workspaceActionStatusFromError(error));
    }
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogMedia className="bg-destructive/10 text-destructive">
          <LuLogOut aria-hidden="true" />
        </AlertDialogMedia>
        <AlertDialogTitle className="min-w-0 break-words">
          Leave {workspace.name}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          You&apos;ll lose access to this workspace. An admin can invite you
          again.
        </AlertDialogDescription>
      </AlertDialogHeader>

      {status.kind === "forbidden" && (
        <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
          Owners can&apos;t leave a workspace.
        </AuthBanner>
      )}
      {status.kind === "error" && (
        <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
          {status.message}
        </AuthBanner>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          disabled={isBusy}
          onClick={() => void handleLeave()}
          className="gap-2"
        >
          {isBusy ? (
            <>
              <LuLoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Leaving
            </>
          ) : (
            "Leave workspace"
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

/** "Leave workspace" button and its confirmation dialog, for everyone who is not the owner. */
export function LeaveWorkspaceDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="outline" size="lg" className={DESTRUCTIVE_OUTLINE} />
        }
      >
        Leave workspace
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <LeaveWorkspaceForm />
      </AlertDialogContent>
    </AlertDialog>
  );
}
