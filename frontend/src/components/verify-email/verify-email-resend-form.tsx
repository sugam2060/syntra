"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";

import { useResendVerification } from "@/api/auth";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthInput } from "@/components/shared/auth-input";
import { AuthSubmitButton } from "@/components/shared/auth-submit-button";
import { Field, FieldGroup } from "@/components/ui/field";
import { ApiError } from "@/lib/api-error";
import {
  EMAIL_MAX_LENGTH,
  type ResendVerificationInput,
  resendVerificationSchema,
} from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";
import type { ResendVerificationStatus } from "@/types/verify-email";

const IDLE: ResendVerificationStatus = { kind: "idle" };

type VerifyEmailResendFormProps = {
  /** Called once the gateway accepted the request. Its 202 says nothing about whether the account exists. */
  onSent: () => void;
};

function statusFromError(error: unknown): ResendVerificationStatus {
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

/** Asks for the address and requests a new verification link. */
export function VerifyEmailResendForm({ onSent }: VerifyEmailResendFormProps) {
  const resend = useResendVerification();
  const [status, setStatus] = useState<ResendVerificationStatus>(IDLE);

  const form = useForm({
    defaultValues: { email: "" } satisfies ResendVerificationInput,
    validators: { onSubmit: resendVerificationSchema },
    onSubmit: async ({ value }) => {
      setStatus(IDLE);
      try {
        await resend.mutateAsync({ email: value.email.trim().toLowerCase() });
        toast.success("Verification email sent", {
          description:
            "If an unverified account exists for that address, we sent a new link.",
        });
        onSent();
      } catch (error: unknown) {
        const next = statusFromError(error);
        setStatus(next);
        toast.error(
          next.kind === "rate-limited"
            ? "Too many attempts. Try again in a minute."
            : "Couldn't send the email. Try again.",
        );
      }
    },
  });

  return (
    <form
      noValidate
      className="w-full text-left"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FieldGroup className="gap-4">
        {status.kind === "rate-limited" && (
          <AuthBanner variant={AUTH_BANNER_VARIANT.warning}>
            Too many attempts. Try again in a minute.
          </AuthBanner>
        )}
        {status.kind === "error" && (
          <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
            {status.message}
          </AuthBanner>
        )}

        <form.Field name="email">
          {(field) => {
            const invalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid} className="gap-1">
                <AuthFieldLabel htmlFor="verify-email-resend-email">
                  Email
                </AuthFieldLabel>
                <AuthInput
                  id="verify-email-resend-email"
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  maxLength={EMAIL_MAX_LENGTH}
                  placeholder="you@company.com"
                  value={field.state.value}
                  disabled={resend.isPending}
                  aria-invalid={invalid}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {invalid && (
                  <AuthFieldError>
                    {field.state.meta.errors[0]?.message ??
                      "Enter a valid email address."}
                  </AuthFieldError>
                )}
              </Field>
            );
          }}
        </form.Field>

        <AuthSubmitButton pending={resend.isPending} pendingLabel="Sending...">
          Send a new link
        </AuthSubmitButton>
      </FieldGroup>
    </form>
  );
}
