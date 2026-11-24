import { LuCircleAlert } from "react-icons/lu";

import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import { VerifyEmailBackLink } from "@/components/verify-email/verify-email-back-link";
import { VerifyEmailCard } from "@/components/verify-email/verify-email-card";
import { Button } from "@/components/ui/button";
import { AUTH_STATUS_TONE } from "@/types/shared";
import type { VerifyEmailFailure } from "@/types/verify-email";

type VerifyEmailRetryProps = {
  failure: VerifyEmailFailure;
  onRetry: () => void;
};

/** The request failed before the gateway judged the token (offline, throttled, server error), so the same link may still work. */
export function VerifyEmailRetry({ failure, onRetry }: VerifyEmailRetryProps) {
  return (
    <VerifyEmailCard
      icon={
        <AuthStatusIcon icon={LuCircleAlert} tone={AUTH_STATUS_TONE.warning} />
      }
      title="We couldn't verify your email"
      description={
        failure.kind === "rate-limited"
          ? "Too many attempts. Try again in a minute."
          : failure.message
      }
    >
      <div className="flex w-full flex-col gap-2">
        <Button
          type="button"
          size="lg"
          onClick={onRetry}
          className="h-10 w-full px-4 hover:bg-primary-hover sm:h-9"
        >
          Try again
        </Button>
        <VerifyEmailBackLink />
      </div>
    </VerifyEmailCard>
  );
}
