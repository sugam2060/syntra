import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-error";
import type { CreateApiKeyRequest } from "@/types/schema";

import { createApiKey, listApiKeys, revokeApiKey } from "./api-keys.api";

export const apiKeyKeys = {
  all: ["api-keys"] as const,
  list: (workspaceId: string) => [...apiKeyKeys.all, workspaceId, "list"] as const,
};

/** A 403 or 404 will not change by asking again; only transient failures are retried. */
function retryTransient(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return false;
  }
  return failureCount < 1;
}

/** The workspace's keys (never their secrets). Pass `null` until the workspace id is known. */
export function useApiKeys(workspaceId: string | null) {
  return useQuery({
    queryKey: apiKeyKeys.list(workspaceId ?? ""),
    queryFn: () => listApiKeys(workspaceId ?? ""),
    enabled: workspaceId !== null,
    retry: retryTransient,
  });
}

/**
 * Creates a key. The plaintext key lives only in this mutation's result: it is never written to the
 * query cache, and `gcTime: 0` drops it as soon as nothing observes the mutation. Call `reset()` when
 * the reveal dialog closes.
 */
export function useCreateApiKey(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApiKeyRequest) => createApiKey(workspaceId, input),
    gcTime: 0,
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeyKeys.list(workspaceId) });
    },
  });
}

export function useRevokeApiKey(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => revokeApiKey(workspaceId, keyId),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiKeyKeys.list(workspaceId) });
    },
  });
}
