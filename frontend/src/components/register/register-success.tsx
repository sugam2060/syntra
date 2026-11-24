"use client";

import { LuMail } from "react-icons/lu";
import { toast } from "sonner";

import { useResendVerification } from "@/api/auth";
import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import { ApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { AUTH_STATUS_TONE } from "@/types/shared";

const RESEND_COOLDOWN_SECONDS = 60;
const GMAIL_URL = "https://mail.google.com/";

type RegisterSuccessProps = {
  email: string;
  onStartOver: () => void;
};

/** "Check your email" state. Registering sends the first link, so the resend cooldown starts running right away. */
export function RegisterSuccess({ email, onStartOver }: RegisterSuccessProps) {
  const resend = useResendVerification();
  const { secondsLeft, restart } = useCountdown(RESEND_COOLDOWN_SECONDS);
  const canResend = secondsLeft === 0 && !resend.isPending;

  function handleResend(): void {
    resend.mutate(
      { email },
      {
        onSuccess: () => {
          restart();
          toast.success("Verification email sent", {
            description: `We sent a new link to ${email}.`,
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
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          Check your email
        </h1>
        <p className="text-sm leading-[21px] text-pretty text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Click it
          to activate your account.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <a
          href={GMAIL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-10 w-full gap-2 bg-card px-4 hover:bg-surface sm:h-9",
          )}
        >
          Open Gmail
        </a>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!canResend}
            onClick={handleResend}
            className="h-8 px-3 text-xs text-primary hover:bg-surface"
          >
            {resend.isPending ? "Sending..." : "Resend email"}
          </Button>
          {secondsLeft > 0 && (
            <span
              className="font-mono text-[13px] leading-5 text-muted-foreground tabular-nums"
              aria-live="off"
            >
              Resend in {secondsLeft}s
            </span>
          )}
        </div>
      </div>

      <p className="text-xs leading-[18px] text-muted-foreground">
        Wrong address?{" "}
        <button
          type="button"
          onClick={onStartOver}
          className="font-medium text-primary hover:underline"
        >
          Start over
        </button>
      </p>
    </div>
  );
}
