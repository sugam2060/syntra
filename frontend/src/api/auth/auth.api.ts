import {
  apiRequest,
  apiRequestVoid,
  refreshAccessToken,
} from "@/lib/api-client";
import { ApiError } from "@/lib/api-error";
import { getAccessToken } from "@/lib/auth-token";
import { env } from "@/lib/env";
import type { RegisterResponse } from "@/types/register";
import type {
  ChangePasswordRequest,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordRequest,
  VerifyEmailInput,
} from "@/types/schema";
import type { AuthProfile, AuthResponse } from "@/types/shared";

import {
  authProfileSchema,
  authResponseSchema,
  googleLinkResponseSchema,
  registerResponseSchema,
} from "./auth.schemas";

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest("/authentication/login", {
    method: "POST",
    body: input,
    schema: authResponseSchema,
    auth: false,
  });
}

/** The signed-in user and how they can sign in. A 401 triggers one refresh and a retry in the client. */
export function getCurrentUser(): Promise<AuthProfile> {
  return apiRequest("/authentication/me", { schema: authProfileSchema });
}

/**
 * Ends the session of this device: the gateway revokes the refresh session named by the cookie
 * and clears it. 204. No bearer token is needed, so an expired access token cannot block sign-out.
 */
export function logout(): Promise<void> {
  return apiRequestVoid("/authentication/logout", {
    method: "POST",
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

/**
 * Activates the account with the token from the emailed link. 204 on success, 400 when the token is
 * invalid, expired or already used. The token is single-use, so call this once per link.
 */
export function verifyEmail(input: VerifyEmailInput): Promise<void> {
  return apiRequestVoid("/authentication/verify-email", {
    method: "POST",
    body: { token: input.token },
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

/**
 * Finishes Google sign-in. The gateway already set the refresh cookie before redirecting here and put no token in
 * the URL, so one refresh (through the shared single-flight client) trades the cookie for the access token.
 * Resolves `true` because TanStack Query forbids an `undefined` result; throws when no session could be started.
 */
export async function completeOAuthSignIn(): Promise<true> {
  if (!(await refreshAccessToken())) {
    throw new ApiError({
      status: 401,
      code: null,
      message: "Couldn't start your session.",
    });
  }
  return true;
}

/**
 * Tells whether this browser has a session, for public pages that must work signed out. With a stored
 * access token it asks the gateway who this is (refreshing once if the token expired); without one it
 * tries a single refresh. Unlike `getCurrentUser`, a missing session resolves `false` and never
 * redirects to `/login`. Throws only when the server was unreachable.
 */
export async function probeSession(): Promise<boolean> {
  if (getAccessToken() === null) {
    return refreshAccessToken();
  }
  try {
    await apiRequest("/authentication/me", {
      schema: authProfileSchema,
      redirectOnAuthFailure: false,
    });
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return false;
    }
    throw error;
  }
}

/** Google auth is a full-page redirect, so this returns a URL instead of calling fetch. */
export function getGoogleSignInUrl(): string {
  return `${env.NEXT_PUBLIC_API_URL}/authentication/google`;
}

/**
 * Sets a new password, or adds a first one to an OAuth-only account (omit `currentPassword`).
 * The gateway revokes every other session and answers like login with a fresh session: the caller must store
 * the new access token. 403 means the current password is wrong; 400 means it is missing or the new one is unchanged.
 */
export function changePassword(
  input: ChangePasswordRequest,
): Promise<AuthResponse> {
  return apiRequest("/authentication/change-password", {
    method: "POST",
    body: input,
    schema: authResponseSchema,
  });
}

/**
 * Starts linking a Google account. Resolves the https URL the browser must be sent to; Google then
 * returns to `/auth/callback` with the outcome.
 */
export async function startGoogleLink(): Promise<string> {
  const { url } = await apiRequest("/authentication/google/link", {
    method: "POST",
    schema: googleLinkResponseSchema,
  });
  return url;
}

/** Unlinks Google. 204; 404 when it is not linked; 409 when it is the only way the user can sign in. */
export function unlinkGoogle(): Promise<void> {
  return apiRequestVoid("/authentication/google", { method: "DELETE" });
}

/** Ends every session of the user, including this one. 204. The refresh cookie is cleared by the gateway. */
export function logoutAll(): Promise<void> {
  return apiRequestVoid("/authentication/logout-all", { method: "POST" });
}
