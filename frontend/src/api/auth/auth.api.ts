import { apiRequest, apiRequestVoid } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { RegisterResponse } from "@/types/register";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordRequest,
} from "@/types/schema";
import type { AuthResponse } from "@/types/shared";

import { authResponseSchema, registerResponseSchema } from "./auth.schemas";

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest("/authentication/login", {
    method: "POST",
    body: input,
    schema: authResponseSchema,
    auth: false,
  });
}

/** Creates an inactive account and queues the verification email. It does not sign the user in. */
export function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiRequest("/authentication/register", {
    method: "POST",
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      name: input.name.trim(),
    },
    schema: registerResponseSchema,
    auth: false,
  });
}

/** The gateway answers 202 whether or not the account exists, so the UI never reveals which emails are registered. */
export function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  return apiRequestVoid("/authentication/forgot-password", {
    method: "POST",
    body: { email: input.email.trim().toLowerCase() },
    auth: false,
  });
}

/**
 * Sets a new password with the token from the emailed link. 204 on success, 400 when the token is
 * invalid, expired or already used. Only `token` and `password` are sent: the gateway rejects extra fields.
 */
export function resetPassword(input: ResetPasswordRequest): Promise<void> {
  return apiRequestVoid("/authentication/reset-password", {
    method: "POST",
    body: { token: input.token, password: input.password },
    auth: false,
  });
}

/** The gateway answers 202 whether or not the account exists. */
export function resendVerification(
  input: ResendVerificationInput,
): Promise<void> {
  return apiRequestVoid("/authentication/resend-verification", {
    method: "POST",
    body: input,
    auth: false,
  });
}

/** Google auth is a full-page redirect, so this returns a URL instead of calling fetch. */
export function getGoogleSignInUrl(): string {
  return `${env.NEXT_PUBLIC_API_URL}/authentication/google`;
}
