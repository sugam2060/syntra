"use client";

import { LuMail } from "react-icons/lu";
import { toast } from "sonner";

import { useForgotPassword } from "@/api/auth";
import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCountdown } from "@/hooks/use-countdown";
import { ApiError } from "@/lib/api-error";
import { AUTH_STATUS_TONE } from "@/types/shared";

const RESEND_COOLDOWN_SECONDS = 60;

type ForgotPasswordSentProps = {
  email: string;
};

/** Confirmation shown after the request. The gateway answers the same whether or not the account exists, so the copy says "if". */
export function ForgotPasswordSent({ email }: ForgotPasswordSentProps) {
  const forgotPassword = useForgotPassword();
  const { secondsLeft, restart } = useCountdown(RESEND_COOLDOWN_SECONDS);
  const canResend = secondsLeft === 0 && !forgotPassword.isPending;

  function handleResend(): void {
    forgotPassword.mutate(
      { email },
      {
        onSuccess: () => {
          restart();
          toast.success("Reset link sent", {
            description: `If an account exists for ${email}, we sent a new link.`,
          });
        },
        onError: (error: unknown) =>
          toast.error(
            error instanceof ApiError
              ? error.message
              : "Couldn't send the email. Try again.",
          ),
      },
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <AuthStatusIcon icon={LuMail} tone={AUTH_STATUS_TONE.primary} />

      <div className="flex flex-col gap-2">
        <DialogTitle className="text-lg leading-[26px] font-semibold tracking-[-0.2px]">
          Check your email
        </DialogTitle>
        <DialogDescription className="leading-[21px] text-pretty">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{email}</span>, we sent a
          link to reset your password. It expires in 30 minutes.
        </DialogDescription>
      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canResend}
            onClick={handleResend}
            className="h-8 px-3 text-xs text-primary hover:bg-surface"
          >
            {forgotPassword.isPending ? "Sending..." : "Resend link"}
          </Button>
          {secondsLeft > 0 && (
            <span className="font-mono text-[13px] leading-5 text-muted-foreground tabular-nums">
              Resend in {secondsLeft}s
            </span>
          )}
        </div>
        <DialogClose
          render={
            <Button
              variant="outline"
              size="lg"
              className="h-10 w-full bg-card hover:bg-surface sm:h-9 dark:bg-card dark:hover:bg-surface"
            />
          }
        >
          Back to sign in
        </DialogClose>
      </div>
    </div>
  );
}
