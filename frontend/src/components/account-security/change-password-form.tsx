"use client";

import { useForm } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useChangePassword } from "@/api/auth";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { PasswordInput } from "@/components/shared/password-input";
import { PasswordStrength } from "@/components/shared/password-strength";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { ApiError } from "@/lib/api-error";
import type { ChangePasswordStatus } from "@/types/account-security";
import {
  type ChangePasswordInput,
  createChangePasswordSchema,
  PASSWORD_MAX_LENGTH,
} from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";

const IDLE: ChangePasswordStatus = { kind: "idle" };

type ChangePasswordFormProps = {
  hasPassword: boolean;
  /** Reports a request in flight, so the dialog can refuse to close under it. */
  onBusyChange: (busy: boolean) => void;
  onDone: () => void;
};

function statusFromError(error: unknown, hasPassword: boolean): ChangePasswordStatus {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return { kind: "wrong-current" };
    }
    if (error.status === 400 && hasPassword) {
      return { kind: "unchanged" };
    }
    if (error.status === 429) {
      return { kind: "rate-limited" };
    }
    return { kind: "error", message: error.message };
  }
  return { kind: "error", message: "Something went wrong. Try again." };
}

export function ChangePasswordForm({
  hasPassword,
  onBusyChange,
  onDone,
}: ChangePasswordFormProps) {
  const changePassword = useChangePassword();
  const [status, setStatus] = useState<ChangePasswordStatus>(IDLE);
  const schema = useMemo(() => createChangePasswordSchema(hasPassword), [hasPassword]);
  const isBusy = changePassword.isPending;

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    } satisfies ChangePasswordInput,
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setStatus(IDLE);
      onBusyChange(true);
      try {
        // confirmPassword stays in the browser; an account without a password sends no currentPassword.
        await changePassword.mutateAsync(
          hasPassword
            ? { currentPassword: value.currentPassword, newPassword: value.newPassword }
            : { newPassword: value.newPassword },
        );
        toast.success(
          hasPassword
            ? "Password updated. Other devices were signed out."
            : "Password added.",
        );
        onBusyChange(false);
        onDone();
      } catch (error: unknown) {
        onBusyChange(false);
        setStatus(statusFromError(error, hasPassword));
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
      className="flex flex-col gap-4"
    >
      <FieldGroup className="gap-4">
        {status.kind === "rate-limited" && (
          <AuthBanner variant={AUTH_BANNER_VARIANT.warning}>
            Too many attempts. Try again in a minute.
          </AuthBanner>
        )}
        {status.kind === "error" && (
          <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>{status.message}</AuthBanner>
        )}

        {hasPassword && (
          <form.Field name="currentPassword">
            {(field) => {
              const wrong = status.kind === "wrong-current";
              const invalid =
                wrong || (field.state.meta.isTouched && !field.state.meta.isValid);
              return (
                <Field data-invalid={invalid} className="gap-1.5">
                  <AuthFieldLabel htmlFor={field.name}>Current password</AuthFieldLabel>
                  <PasswordInput
                    id={field.name}
                    name={field.name}
                    autoComplete="current-password"
                    maxLength={PASSWORD_MAX_LENGTH}
                    value={field.state.value}
                    disabled={isBusy}
                    aria-invalid={invalid}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      if (wrong) {
                        setStatus(IDLE);
                      }
                      field.handleChange(event.target.value);
                    }}
                  />
                  {invalid && (
                    <AuthFieldError>
                      {wrong
                        ? "Current password is incorrect."
                        : (field.state.meta.errors[0]?.message ??
                          "Enter your current password.")}
                    </AuthFieldError>
                  )}
                </Field>
              );
            }}
          </form.Field>
        )}

        <form.Field name="newPassword">
          {(field) => {
            const unchanged = status.kind === "unchanged";
            const invalid =
              unchanged || (field.state.meta.isTouched && !field.state.meta.isValid);
            return (
              <Field data-invalid={invalid} className="gap-1.5">
                <AuthFieldLabel htmlFor={field.name}>New password</AuthFieldLabel>
                <PasswordInput
                  id={field.name}
                  name={field.name}
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX_LENGTH}
                  placeholder="Create a new password"
                  value={field.state.value}
                  disabled={isBusy}
                  aria-invalid={invalid}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    if (unchanged) {
                      setStatus(IDLE);
                    }
                    field.handleChange(event.target.value);
                  }}
                />
                <PasswordStrength password={field.state.value} />
                {invalid && (
                  <AuthFieldError>
                    {unchanged
                      ? "New password must be different from the current one."
                      : (field.state.meta.errors[0]?.message ??
                        "Enter a valid password.")}
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
              <Field data-invalid={invalid} className="gap-1.5">
                <AuthFieldLabel htmlFor={field.name}>Confirm new password</AuthFieldLabel>
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
                    {field.state.meta.errors[0]?.message ?? "Passwords don't match."}
                  </AuthFieldError>
                )}
              </Field>
            );
          }}
        </form.Field>

        <p className="text-xs leading-[18px] text-muted-foreground">
          You&apos;ll stay signed in here. Other devices will be signed out.
        </p>
      </FieldGroup>

      <DialogFooter className="-mx-5 -mb-5 px-5">
        <DialogClose
          render={<Button type="button" variant="outline" disabled={isBusy} />}
          className="h-10 sm:h-8"
        >
          Cancel
        </DialogClose>
        <Button
          type="submit"
          disabled={isBusy}
          className="h-10 gap-2 hover:bg-primary-hover disabled:bg-primary-hover disabled:opacity-100 sm:h-8"
        >
          {isBusy ? (
            <>
              <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              Updating...
            </>
          ) : hasPassword ? (
            "Update password"
          ) : (
            "Add password"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
