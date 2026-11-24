"use client";

import { useState } from "react";
import { LuClock } from "react-icons/lu";

import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import { VerifyEmailBackLink } from "@/components/verify-email/verify-email-back-link";
import { VerifyEmailCard } from "@/components/verify-email/verify-email-card";
import { VerifyEmailResendForm } from "@/components/verify-email/verify-email-resend-form";
import { VerifyEmailSent } from "@/components/verify-email/verify-email-sent";
import { AUTH_STATUS_TONE } from "@/types/shared";
import {
  VERIFY_EMAIL_PROBLEM,
  type VerifyEmailProblem,
} from "@/types/verify-email";

const COPY: Record<VerifyEmailProblem, { title: string; description: string }> =
  {
    [VERIFY_EMAIL_PROBLEM.expired]: {
      title: "This link has expired",
      description:
        "Verification links are valid for 24 hours and can be used once.",
    },
    [VERIFY_EMAIL_PROBLEM.missing]: {
      title: "This link is incomplete",
      description:
        "The verification link is missing its token. Open it again from your email, or send a new one.",
    },
  };

type VerifyEmailRecoveryProps = {
  problem: VerifyEmailProblem;
};

/** The link cannot be used: explains why and offers a new one, then confirms once it is sent. */
export function VerifyEmailRecovery({ problem }: VerifyEmailRecoveryProps) {
  const [sent, setSent] = useState(false);

  if (sent) {
    return <VerifyEmailSent />;
  }

  const { title, description } = COPY[problem];

  return (
    <VerifyEmailCard
      icon={<AuthStatusIcon icon={LuClock} tone={AUTH_STATUS_TONE.warning} />}
      title={title}
      description={description}
    >
      <div className="flex w-full flex-col gap-2">
        <VerifyEmailResendForm onSent={() => setSent(true)} />
        <VerifyEmailBackLink />
      </div>
    </VerifyEmailCard>
  );
}
