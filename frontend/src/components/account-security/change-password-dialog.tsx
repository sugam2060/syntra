"use client";

import { useState } from "react";

import { ChangePasswordForm } from "@/components/account-security/change-password-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** An account with a password changes it; an OAuth-only account adds its first one. */
  hasPassword: boolean;
};

/** 480px dialog for changing a password or adding a first one. The form unmounts on close, so it always opens empty. */
export function ChangePasswordDialog({
  open,
  onOpenChange,
  hasPassword,
}: ChangePasswordDialogProps) {
  const [busy, setBusy] = useState(false);

  return (
    <Dialog
      open={open}
      // A request in flight must finish before the dialog goes away, or its outcome would be lost.
      onOpenChange={(next) => {
        if (!busy) {
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="gap-4 rounded-[12px] p-5 sm:max-w-[480px]">
        <DialogHeader className="gap-1 pr-8">
          <DialogTitle className="text-base leading-6 font-semibold">
            {hasPassword ? "Change password" : "Add password"}
          </DialogTitle>
          <DialogDescription>
            {hasPassword
              ? "Enter your current password, then choose a new one."
              : "Add a password to also sign in with your email."}
          </DialogDescription>
        </DialogHeader>
        <ChangePasswordForm
          hasPassword={hasPassword}
          onBusyChange={setBusy}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
