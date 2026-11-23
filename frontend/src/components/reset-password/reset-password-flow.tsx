"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { ResetPasswordForm } from "@/components/reset-password/reset-password-form";
import { ResetPasswordInvalid } from "@/components/reset-password/reset-password-invalid";
import { ResetPasswordSuccess } from "@/components/reset-password/reset-password-success";
import { AuthHeader } from "@/components/shared/auth-header";
import type { ResetPasswordOutcome } from "@/types/reset-password";
import { resetTokenSchema } from "@/types/schema";

/** Reads `?token=` from the link and shows the form, the success state, or the "link no longer valid" state. */
export function ResetPasswordFlow() {
  const token = useSearchParams().get("token") ?? "";
  const [outcome, setOutcome] = useState<ResetPasswordOutcome>("pending");

  // A missing or malformed token can never work, so skip the request entirely.
  if (!resetTokenSchema.safeParse(token).success || outcome === "rejected") {
    return <ResetPasswordInvalid />;
  }

  if (outcome === "done") {
    return <ResetPasswordSuccess />;
  }

  return (
    <>
      <AuthHeader
        title="Set a new password"
        subtitle="Choose a password with at least 10 characters."
      />
      <ResetPasswordForm token={token} onFinished={setOutcome} />
    </>
  );
}
