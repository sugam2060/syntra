"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";

import { useForgotPassword } from "@/api/auth";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthInput } from "@/components/shared/auth-input";
import { AuthSubmitButton } from "@/components/shared/auth-submit-button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { ApiError } from "@/lib/api-error";
import type { ForgotPasswordStatus } from "@/types/login";
import {
  EMAIL_MAX_LENGTH,
  type ForgotPasswordInput,
  forgotPasswordSchema,
} from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";

const IDLE: ForgotPasswordStatus = { kind: "idle" };

type ForgotPasswordFormProps = {
  /** Read once when the dialog opens, so the email typed on the sign-in form carries over. */
  getInitialEmail: () => string;
  /** Called with the address the reset link was sent to. */
  onSent: (email: string) => void;
};

function statusFromError(error: unknown): ForgotPasswordStatus {
  if (error instanceof ApiError && error.status === 429) {
    return { kind: "rate-limited" };
  }
  return {
    kind: "error",
    message:
      error instanceof ApiError ? error.message : "Something went wrong. Try again.",
  };
}

export function ForgotPasswordForm({
  getInitialEmail,
  onSent,
}: ForgotPasswordFormProps) {
  const forgotPassword = useForgotPassword();
  const [initialEmail] = useState(getInitialEmail);
  const [status, setStatus] = useState<ForgotPasswordStatus>(IDLE);

  const form = useForm({
    defaultValues: { email: initialEmail } satisfies ForgotPasswordInput,
    validators: { onSubmit: forgotPasswordSchema },
    onSubmit: async ({ value }) => {
      setStatus(IDLE);
      try {
        await forgotPassword.mutateAsync(value);
        onSent(value.email.trim().toLowerCase());
      } catch (error: unknown) {
        setStatus(statusFromError(error));
      }
    },
  });

  return (
    <>
      <DialogHeader className="gap-1 pr-6">
        <DialogTitle className="text-lg leading-[26px] font-semibold tracking-[-0.2px]">
          Forgot your password?
        </DialogTitle>
        <DialogDescription>
          Enter your email and we&apos;ll send you a reset link.
        </DialogDescription>
      </DialogHeader>

      <form
        noValidate
        onSubmit={(event) => {
          // The dialog is a React child of the sign-in form: stop the submit from reaching it.
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
                  <AuthFieldLabel htmlFor="forgot-password-email">Email</AuthFieldLabel>
                  <AuthInput
                    id="forgot-password-email"
                    name={field.name}
                    type="email"
                    autoComplete="email"
                    autoFocus
                    maxLength={EMAIL_MAX_LENGTH}
                    placeholder="you@company.com"
                    value={field.state.value}
                    disabled={forgotPassword.isPending}
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

          <AuthSubmitButton
            pending={forgotPassword.isPending}
            pendingLabel="Sending..."
          >
            Send reset link
          </AuthSubmitButton>
        </FieldGroup>
      </form>
    </>
  );
}
