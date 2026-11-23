import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setAccessToken } from "@/lib/auth-token";

import {
  forgotPassword,
  login,
  register,
  resendVerification,
  resetPassword,
} from "./auth.api";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

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
