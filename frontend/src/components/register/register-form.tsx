"use client";

import { useForm } from "@tanstack/react-form";
import Link from "next/link";
import { useState } from "react";

import { useRegister } from "@/api/auth";
import { PasswordStrength } from "@/components/shared/password-strength";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthFooter } from "@/components/shared/auth-footer";
import { AuthInput } from "@/components/shared/auth-input";
import { AuthSubmitButton } from "@/components/shared/auth-submit-button";
import { GoogleButton } from "@/components/shared/google-button";
import { PasswordInput } from "@/components/shared/password-input";
import { Field, FieldGroup } from "@/components/ui/field";
import { ApiError } from "@/lib/api-error";
import type { RegisterFormStatus } from "@/types/register";
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  type RegisterInput,
  registerSchema,
} from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";

const IDLE: RegisterFormStatus = { kind: "idle" };

type RegisterFormProps = {
  /** Called with the address the verification email was sent to. */
  onRegistered: (email: string) => void;
};

function statusFromError(error: unknown): RegisterFormStatus {
  if (!(error instanceof ApiError)) {
    return { kind: "error", message: "Something went wrong. Try again." };
  }
  if (error.status === 409) {
    return { kind: "email-taken" };
  }
  if (error.status === 429) {
    return { kind: "rate-limited" };
  }
  return { kind: "error", message: error.message };
}

export function RegisterForm({ onRegistered }: RegisterFormProps) {
  const register = useRegister();
  const [status, setStatus] = useState<RegisterFormStatus>(IDLE);
  const isBusy = register.isPending;

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" } satisfies RegisterInput,
    validators: { onSubmit: registerSchema },
    onSubmit: async ({ value }) => {
      setStatus(IDLE);
      try {
        await register.mutateAsync(value);
        onRegistered(value.email.trim().toLowerCase());
      } catch (error: unknown) {
        setStatus(statusFromError(error));
      }
    },
  });

  function clearEmailTaken(): void {
    if (status.kind === "email-taken") {
      setStatus(IDLE);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
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

        <GoogleButton disabled={isBusy}>Sign up with Google</GoogleButton>

        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs leading-[18px] text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4">
            <form.Field name="name">
              {(field) => {
                const invalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={invalid} className="gap-1">
                    <AuthFieldLabel htmlFor={field.name}>Full name</AuthFieldLabel>
                    <AuthInput
                      id={field.name}
                      name={field.name}
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={NAME_MAX_LENGTH}
                      placeholder="Maya Chen"
                      value={field.state.value}
                      disabled={isBusy}
                      aria-invalid={invalid}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                    />
                    {invalid && (
                      <AuthFieldError>
                        {field.state.meta.errors[0]?.message ??
                          "Enter a valid name."}
                      </AuthFieldError>
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="email">
              {(field) => {
                const emailTaken = status.kind === "email-taken";
                const fieldInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const invalid = fieldInvalid || emailTaken;
                return (
                  <Field data-invalid={invalid} className="gap-1">
                    <AuthFieldLabel htmlFor={field.name}>Work email</AuthFieldLabel>
                    <AuthInput
                      id={field.name}
                      name={field.name}
                      type="email"
                      autoComplete="email"
                      maxLength={EMAIL_MAX_LENGTH}
                      placeholder="you@company.com"
                      value={field.state.value}
                      disabled={isBusy}
                      aria-invalid={invalid}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearEmailTaken();
                      }}
                    />
                    {emailTaken && (
                      <AuthFieldError>
                        An account with this email already exists.{" "}
                        <Link
                          href="/login"
                          className="font-medium text-primary underline"
                        >
                          Sign in instead
                        </Link>
                      </AuthFieldError>
                    )}
                    {!emailTaken && fieldInvalid && (
                      <AuthFieldError>
                        {field.state.meta.errors[0]?.message ??
                          "Enter a valid email address."}
                      </AuthFieldError>
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="password">
              {(field) => {
                const invalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={invalid} className="gap-2">
                    <AuthFieldLabel htmlFor={field.name}>Password</AuthFieldLabel>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      autoComplete="new-password"
                      maxLength={PASSWORD_MAX_LENGTH}
                      placeholder="Create a password"
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

            <AuthSubmitButton pending={isBusy} pendingLabel="Creating account...">
              Create account
            </AuthSubmitButton>
          </FieldGroup>
        </form>
      </div>

      <AuthFooter
        prompt="Already have an account?"
        linkLabel="Sign in"
        href="/login"
        disabled={isBusy}
      />
    </>
  );
}
