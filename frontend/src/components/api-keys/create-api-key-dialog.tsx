"use client";

import { CreateApiKeyForm } from "@/components/api-keys/create-api-key-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreateApiKeyRequest } from "@/types/schema";

type CreateApiKeyDialogProps = {
  open: boolean;
  isPending: boolean;
  error: unknown;
  onSubmit: (request: CreateApiKeyRequest) => void;
  onClose: () => void;
};

/** 520px dialog around the create form. It cannot be dismissed while the request is running. */
export function CreateApiKeyDialog({
  open,
  isPending,
  error,
  onSubmit,
  onClose,
}: CreateApiKeyDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        if (next) {
          return;
        }
        if (isPending) {
          details.cancel();
          return;
        }
        onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>
            The key acts for you and works only in this workspace.
          </DialogDescription>
        </DialogHeader>
        <CreateApiKeyForm isPending={isPending} error={error} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
