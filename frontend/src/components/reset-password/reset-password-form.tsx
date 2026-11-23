"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";

import { useResetPassword } from "@/api/auth";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthSubmitButton } from "@/components/shared/auth-submit-button";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordStrength } from "@/components/shared/password-strength";
import { Field, FieldGroup } from "@/components/ui/field";
import { ApiError } from "@/lib/api-error";
import type {
  ResetPasswordOutcome,
  ResetPasswordStatus,
} from "@/types/reset-password";
import {
  PASSWORD_MAX_LENGTH,
  type ResetPasswordInput,
  resetPasswordSchema,
} from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";

const IDLE: ResetPasswordStatus = { kind: "idle" };

type ResetPasswordFormProps = {
  /** The `token` from the reset link, already checked for length by the parent. */
  token: string;
  /** Called when the attempt ended, either with the password changed or the token refused. */
  onFinished: (outcome: Exclude<ResetPasswordOutcome, "pending">) => void;
};

export function ResetPasswordForm({ token, onFinished }: ResetPasswordFormProps) {
  const resetPassword = useResetPassword();
  const [status, setStatus] = useState<ResetPasswordStatus>(IDLE);
  const isBusy = resetPassword.isPending;

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    } satisfies ResetPasswordInput,
    validators: { onSubmit: resetPasswordSchema },
    onSubmit: async ({ value }) => {
      setStatus(IDLE);
      try {
        // confirmPassword stays in the browser: the gateway rejects unknown fields.
        await resetPassword.mutateAsync({ token, password: value.password });
        onFinished("done");
      } catch (error: unknown) {
        if (error instanceof ApiError && error.status === 400) {
          onFinished("rejected");
          return;
        }
        if (error instanceof ApiError && error.status === 429) {
          setStatus({ kind: "rate-limited" });
          return;
        }
        setStatus({
          kind: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "Something went wrong. Try again.",
        });
      }
    },
  });

  return (
    <form
      noValidate
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

        <form.Field name="password">
          {(field) => {
            const invalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid} className="gap-2">
                <AuthFieldLabel htmlFor={field.name}>New password</AuthFieldLabel>
                <PasswordInput
                  id={field.name}
                  name={field.name}
                  autoComplete="new-password"
                  autoFocus
                  maxLength={PASSWORD_MAX_LENGTH}
                  placeholder="Create a new password"
                  value={field.state.value}
                  disabled={isBusy}
                  aria-invalid={invalid}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                <PasswordStrength password={field.state.value} />
                {invalid && (
                  <AuthFieldError>
                    {field.state.meta.errors[0]?.message ??
                      "Enter a valid password."}
                  </AuthFieldError>
                )}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="confirmPassword">
          {(field) => {
            const invalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid} className="gap-1">
                <AuthFieldLabel htmlFor={field.name}>
                  Confirm password
                </AuthFieldLabel>
                <PasswordInput
                  id={field.name}
                  name={field.name}
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX_LENGTH}
                  placeholder="Repeat your new password"
                  value={field.state.value}
                  disabled={isBusy}
                  aria-invalid={invalid}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {invalid && (
                  <AuthFieldError>
                    {field.state.meta.errors[0]?.message ??
                      "Passwords don't match."}
                  </AuthFieldError>
                )}
              </Field>
            );
          }}
        </form.Field>

        <div className="flex flex-col gap-2">
          <AuthSubmitButton pending={isBusy} pendingLabel="Resetting password...">
            Reset password
          </AuthSubmitButton>
          <p className="text-center text-xs leading-[18px] text-muted-foreground">
            You&apos;ll be signed out of all other devices.
          </p>
        </div>
      </FieldGroup>
    </form>
  );
}
