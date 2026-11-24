"use client";

import { useVerifyEmail } from "@/api/auth";
import { VerifyEmailRecovery } from "@/components/verify-email/verify-email-recovery";
import { VerifyEmailRetry } from "@/components/verify-email/verify-email-retry";
import { VerifyEmailSuccess } from "@/components/verify-email/verify-email-success";
import { VerifyEmailVerifying } from "@/components/verify-email/verify-email-verifying";
import { ApiError } from "@/lib/api-error";
import { verifyEmailTokenSchema } from "@/types/schema";
import {
  VERIFY_EMAIL_PROBLEM,
  type VerifyEmailFailure,
} from "@/types/verify-email";

type VerifyEmailFlowProps = {
  /** The `token` search parameter of the link, or null when it is absent. */
  token: string | null;
};

function failureFromError(error: unknown): VerifyEmailFailure {
  if (error instanceof ApiError && error.status === 429) {
    return { kind: "rate-limited" };
  }
  return {
    kind: "error",
    message:
      error instanceof ApiError
        ? error.message
        : "Something went wrong. Try again.",
  };
}

/**
 * Verifies the link's token once and shows the outcome. The request is a query keyed by the token,
 * so strict mode and re-renders never send the single-use token twice.
 */
export function VerifyEmailFlow({ token }: VerifyEmailFlowProps) {
  // A missing or malformed token can never work, so skip the request entirely.
  const parsed = verifyEmailTokenSchema.safeParse(token);
  const validToken = parsed.success ? parsed.data : null;
  const verification = useVerifyEmail(validToken);

  let announcement = "Verifying your email.";
  let content: React.ReactNode = <VerifyEmailVerifying />;

  if (validToken === null) {
    announcement = "This link is incomplete.";
    content = <VerifyEmailRecovery problem={VERIFY_EMAIL_PROBLEM.missing} />;
  } else if (verification.isSuccess) {
    announcement = "Email verified.";
    content = <VerifyEmailSuccess />;
  } else if (verification.isError && !verification.isFetching) {
    const { error } = verification;
    if (error instanceof ApiError && error.status === 400) {
      // The gateway refused the token: invalid, expired or already used.
      announcement = "This link has expired.";
      content = <VerifyEmailRecovery problem={VERIFY_EMAIL_PROBLEM.expired} />;
    } else {
      announcement = "We couldn't verify your email.";
      content = (
        <VerifyEmailRetry
          failure={failureFromError(error)}
          onRetry={() => void verification.refetch()}
        />
      );
    }
  }

  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {content}
    </>
  );
}
