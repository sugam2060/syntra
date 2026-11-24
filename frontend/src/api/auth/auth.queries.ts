import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { setAccessToken } from "@/lib/auth-token";

import {
  changePassword,
  completeOAuthSignIn,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  logoutAll,
  probeSession,
  register,
  resendVerification,
  resetPassword,
  startGoogleLink,
  unlinkGoogle,
  verifyEmail,
} from "./auth.api";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  /** Outside `authKeys.all` for the same reason: `useLogin` invalidates that prefix, and a refetch here would refresh twice. */
  oauthSignIn: () => ["oauth-sign-in"] as const,
  /** Outside `authKeys.all` too: `useLogin` invalidates that prefix, and a refetch here would refresh again. */
  sessionProbe: () => ["session-probe"] as const,
  /** Deliberately outside `authKeys.all`: signing in must never re-run a single-use token. */
  verifyEmail: (token: string) => ["verify-email", token] as const,
};

/**
 * Completes Google sign-in on `/auth/callback`. A query rather than a mutation so that no effect has to
 * trigger it, and so React strict mode's second mount joins the in-flight request instead of starting
 * another one (parallel refreshes with one cookie look like token reuse and revoke every session).
 * Never retried or refetched for the same reason, and never invalidated by `authKeys.all` while mounted.
 */
export function useCompleteOAuthSignIn() {
  return useQuery({
    queryKey: authKeys.oauthSignIn(),
    queryFn: completeOAuthSignIn,
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retryOnMount: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      void queryClient.invalidateQueries({ queryKey: authKeys.all });
    },
  });
}

/**
 * The signed-in user. The stored access token is sent as is; only when the gateway answers 401 does the
 * client refresh once and retry, and it sends the visitor to `/login` when there is no session. Public pages pass `enabled: false` until
 * `useSessionProbe` says a session exists.
 */
export function useCurrentUser({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: authKeys.me(), queryFn: getCurrentUser, enabled });
}

/**
 * Whether a session exists, for public pages (`/invitations/accept`) that must work signed out. A query
 * rather than an effect so strict mode's second mount joins the in-flight refresh instead of starting a
 * parallel one. Never retried or refetched. `gcTime: 0` drops the answer when the page unmounts, so
 * coming back from `/login` asks again instead of trusting a stale "signed out".
 */
export function useSessionProbe({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: authKeys.sessionProbe(),
    queryFn: probeSession,
    enabled,
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Signs out of this device. The stored access token and the whole query cache are dropped whether or
 * not the request reached the gateway, so the next account never sees this one's data.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      setAccessToken(null);
      queryClient.clear();
    },
  });
}

/**
 * Changes the password, or adds a first one. The gateway revokes every other session and returns a fresh
 * one for this device, so the new access token replaces the stored one before anything else runs.
 */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
    },
  });
}

/** Asks the gateway for the Google consent URL. The caller sends the browser there with the result. */
export function useStartGoogleLink() {
  return useMutation({ mutationFn: startGoogleLink });
}

/** Unlinks Google. Settles by refetching the profile, which also corrects a stale "connected" row after a 404 or 409. */
export function useUnlinkGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unlinkGoogle,
    onSettled: () => queryClient.invalidateQueries({ queryKey: authKeys.me() }),
  });
}

/**
 * Ends every session, this one included. Local state is dropped only once the gateway confirmed: a failed
 * request leaves the session alive on the server, so pretending to be signed out would be wrong.
 */
export function useLogoutAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutAll,
    onSuccess: () => {
      setAccessToken(null);
      queryClient.clear();
    },
  });
}

export function useRegister() {
  return useMutation({ mutationFn: register });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: resetPassword });
}

export function useResendVerification() {
  return useMutation({ mutationFn: resendVerification });
}

/**
 * Verifies the emailed token on `/verify-email`. The token is single-use, so this is a query rather
 * than a mutation fired from an effect: React strict mode's second mount joins the in-flight request
 * (same key) instead of sending a second one that the gateway would refuse as "already used".
 * Never retried, refetched on mount, focus or reconnect. Pass `null` to skip the request.
 * `refetch()` is only for retrying after the request failed without reaching the gateway.
 */
export function useVerifyEmail(token: string | null) {
  return useQuery({
    queryKey: authKeys.verifyEmail(token ?? ""),
    // A query may not resolve to `undefined`, and the endpoint answers 204.
    queryFn: async () => {
      await verifyEmail({ token: token ?? "" });
      return { verified: true as const };
    },
    enabled: token !== null,
    retry: false,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retryOnMount: false,
  });
}
