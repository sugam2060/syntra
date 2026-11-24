"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { LuLoaderCircle, LuTriangleAlert } from "react-icons/lu";
import { toast } from "sonner";

import { useDeleteWorkspace } from "@/api/workspaces";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthInput } from "@/components/shared/auth-input";
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
import { Field } from "@/components/ui/field";
import { ApiError } from "@/lib/api-error";
import { workspaceActionStatusFromError } from "@/lib/workspace-action-status";
import { useWorkspace } from "@/providers/workspace-provider";
import { AUTH_BANNER_VARIANT } from "@/types/shared";
import type { WorkspaceActionStatus } from "@/types/workspace-settings";

const IDLE: WorkspaceActionStatus = { kind: "idle" };

const CONSEQUENCES = [
  "Every project and task in the workspace",
  "Every API key, which stops working at once",
  "Access for every member, including you",
] as const;

/** The dialog body. It only exists while the dialog is open, so the typed text resets on every open. */
function DeleteWorkspaceForm() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const deleteWorkspace = useDeleteWorkspace(workspace.id);
  const confirmationId = useId();
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<WorkspaceActionStatus>(IDLE);
  const isBusy = deleteWorkspace.isPending || deleteWorkspace.isSuccess;
  const matches = confirmation.trim() === workspace.slug;

  async function handleSubmit(): Promise<void> {
    if (!matches || isBusy) {
      return;
    }
    setStatus(IDLE);
    try {
      await deleteWorkspace.mutateAsync();
      toast.success("Workspace deleted");
      router.replace("/");
    } catch (error: unknown) {
      setStatus(
        workspaceActionStatusFromError(
          error,
          error instanceof ApiError && error.status === 404
            ? "This workspace no longer exists or you can't delete it."
            : undefined,
        ),
      );
    }
  }

  return (
    <form
      noValidate
      className="contents"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <AlertDialogHeader>
        <AlertDialogMedia className="bg-destructive/10 text-destructive">
          <LuTriangleAlert aria-hidden="true" />
        </AlertDialogMedia>
        <AlertDialogTitle className="min-w-0 break-words">
          Delete {workspace.name}?
        </AlertDialogTitle>
        <AlertDialogDescription>
          This permanently deletes the workspace and can&apos;t be undone. It
          removes:
        </AlertDialogDescription>
      </AlertDialogHeader>

      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-[21px] text-foreground marker:text-muted-foreground">
        {CONSEQUENCES.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {status.kind === "forbidden" && (
        <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
          You need the Owner role to delete this workspace.
        </AuthBanner>
      )}
      {status.kind === "error" && (
        <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
          {status.message}
        </AuthBanner>
      )}

      <Field className="gap-1">
        <AuthFieldLabel htmlFor={confirmationId} className="block leading-5">
          Type{" "}
          <span className="font-mono text-[13px] break-all">{workspace.slug}</span>{" "}
          to confirm
        </AuthFieldLabel>
        <AuthInput
          id={confirmationId}
          name="confirmation"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={confirmation}
          disabled={isBusy}
          onChange={(event) => {
            setConfirmation(event.target.value);
          }}
          className="font-mono text-[13px]"
        />
      </Field>

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
        <Button
          type="submit"
          variant="destructive"
          disabled={!matches || isBusy}
          className="gap-2"
        >
          {isBusy ? (
            <>
              <LuLoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Deleting
            </>
          ) : (
            "Delete workspace"
          )}
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

/** "Delete workspace" button and its confirmation dialog: the caller must type the workspace URL. */
export function DeleteWorkspaceDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" size="lg" />}>
        Delete workspace
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <DeleteWorkspaceForm />
      </AlertDialogContent>
    </AlertDialog>
  );
}
