"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useLogin, useResendVerification } from "@/api/auth";
import { ForgotPasswordDialog } from "@/components/login/forgot-password-dialog";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthFooter } from "@/components/shared/auth-footer";
import { AuthInput } from "@/components/shared/auth-input";
import { AuthSubmitButton } from "@/components/shared/auth-submit-button";
import { GoogleButton } from "@/components/shared/google-button";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { ApiError } from "@/lib/api-error";
import type { LoginFormStatus } from "@/types/login";
import {
  EMAIL_MAX_LENGTH,
  type LoginInput,
  loginSchema,
  PASSWORD_MAX_LENGTH,
} from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";

const IDLE: LoginFormStatus = { kind: "idle" };
const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";
const INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password.";

function statusFromError(error: unknown, email: string): LoginFormStatus {
  if (!(error instanceof ApiError)) {
    return { kind: "error", message: "Something went wrong. Try again." };
  }
  if (error.status === 401) {
    return { kind: "invalid-credentials" };
  }
  if (error.status === 403 && error.code === EMAIL_NOT_VERIFIED_CODE) {
    return { kind: "email-not-verified", email };
  }
  if (error.status === 429) {
    return { kind: "rate-limited" };
  }
  return { kind: "error", message: error.message };
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const resend = useResendVerification();

  const [status, setStatus] = useState<LoginFormStatus>(() =>
    searchParams.get("error") === "oauth_failed"
      ? { kind: "oauth-failed" }
      : IDLE,
  );

  const isBusy = login.isPending || login.isSuccess;

  const form = useForm({
    defaultValues: { email: "", password: "" } satisfies LoginInput,
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setStatus(IDLE);
      const credentials = {
        email: value.email.trim().toLowerCase(),
        password: value.password,
      };
      try {
        await login.mutateAsync(credentials);
        router.replace("/");
      } catch (error: unknown) {
        setStatus(statusFromError(error, credentials.email));
      }
    },
  });

  function clearCredentialsError(): void {
    if (status.kind === "invalid-credentials") {
      setStatus(IDLE);
    }
  }

  function handleResend(email: string): void {
    resend.mutate(
      { email },
      {
        onSuccess: () =>
          toast.success("Verification email sent", {
            description:
              "If an unverified account exists for that address, we sent a new link.",
          }),
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
    <>
      <div className="flex flex-col gap-4">
        {status.kind === "email-not-verified" && (
          <AuthBanner
            variant={AUTH_BANNER_VARIANT.info}
            action={
              <div>
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  disabled={resend.isPending}
                  onClick={() => handleResend(status.email)}
                  className="h-auto p-0 text-xs font-medium"
                >
                  {resend.isPending ? "Sending..." : "Resend email"}
                </Button>
              </div>
            }
          >
            Verify your email to sign in. We sent a link to {status.email}.
          </AuthBanner>
        )}
        {status.kind === "rate-limited" && (
          <AuthBanner variant={AUTH_BANNER_VARIANT.warning}>
            Too many attempts. Try again in a minute.
          </AuthBanner>
        )}
        {status.kind === "oauth-failed" && (
          <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
            Google sign-in didn&apos;t complete. Try again.
          </AuthBanner>
        )}
        {status.kind === "error" && (
          <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
            {status.message}
          </AuthBanner>
        )}

        <GoogleButton disabled={isBusy}>Continue with Google</GoogleButton>

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
            <form.Field name="email">
              {(field) => {
                const invalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={invalid} className="gap-1">
                    <AuthFieldLabel htmlFor={field.name}>Email</AuthFieldLabel>
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
                        clearCredentialsError();
                      }}
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

            <form.Field name="password">
              {(field) => {
                const fieldInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const credentialsInvalid = status.kind === "invalid-credentials";
                const invalid = fieldInvalid || credentialsInvalid;
                const message = credentialsInvalid
                  ? INVALID_CREDENTIALS_MESSAGE
                  : (field.state.meta.errors[0]?.message ??
                    "Enter your password.");
                return (
                  <Field data-invalid={invalid} className="gap-1">
                    <div className="flex items-center justify-between">
                      <AuthFieldLabel htmlFor={field.name}>Password</AuthFieldLabel>
                      <ForgotPasswordDialog
                        getInitialEmail={() => form.getFieldValue("email")}
                        disabled={isBusy}
                        defaultOpen={searchParams.get("forgot") === "1"}
                      />
                    </div>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      autoComplete="current-password"
                      maxLength={PASSWORD_MAX_LENGTH}
                      placeholder="Enter your password"
                      value={field.state.value}
                      disabled={isBusy}
                      aria-invalid={invalid}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value);
                        clearCredentialsError();
                      }}
                    />
                    {invalid && <AuthFieldError>{message}</AuthFieldError>}
                  </Field>
                );
              }}
            </form.Field>

            <AuthSubmitButton pending={isBusy} pendingLabel="Signing in...">
              Sign in
            </AuthSubmitButton>
          </FieldGroup>
        </form>
      </div>

      <AuthFooter
        prompt="New to Syntra?"
        linkLabel="Create an account"
        href="/register"
        disabled={isBusy}
      />
    </>
  );
}
