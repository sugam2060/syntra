"use client";

import { useState } from "react";

import { ForgotPasswordForm } from "@/components/login/forgot-password-form";
import { ForgotPasswordSent } from "@/components/login/forgot-password-sent";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

type ForgotPasswordDialogProps = {
  /** Returns the email currently typed on the sign-in form, used to prefill the dialog. */
  getInitialEmail: () => string;
  /** Disables the trigger while a sign-in request is in flight. */
  disabled: boolean;
  /** Opens the dialog on first render, for the "Request a new link" button on the reset-password page. */
  defaultOpen?: boolean;
};

/** The "Forgot password?" link and the dialog it opens. No separate page: the whole flow lives here. */
export function ForgotPasswordDialog({
  getInitialEmail,
  disabled,
  defaultOpen = false,
}: ForgotPasswordDialogProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <Dialog
      defaultOpen={defaultOpen}
      // Reset after the close animation so reopening starts on the form again.
      onOpenChangeComplete={(open) => {
        if (!open) {
          setSentTo(null);
        }
      }}
    >
      <DialogTrigger
        disabled={disabled}
        className="text-xs leading-4 font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground"
      >
        Forgot password?
      </DialogTrigger>
      <DialogContent className="gap-6 rounded-card p-6 sm:max-w-[400px]">
        {sentTo === null ? (
          <ForgotPasswordForm
            getInitialEmail={getInitialEmail}
            onSent={setSentTo}
          />
        ) : (
          <ForgotPasswordSent email={sentTo} />
        )}
      </DialogContent>
    </Dialog>
  );
}
