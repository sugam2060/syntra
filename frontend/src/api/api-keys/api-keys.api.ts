import { z } from "zod";

import { apiRequest, apiRequestVoid } from "@/lib/api-client";
import type { CreateApiKeyRequest } from "@/types/schema";
import type { ApiKeySummary, CreatedApiKey } from "@/types/shared";

import { apiKeySummarySchema, createdApiKeySchema } from "./api-keys.schemas";

function apiKeysPath(workspaceId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/api-keys`;
}

/** Every key of the workspace, newest first, including revoked and expired ones. 403 without `ai:manage_keys`. */
export function listApiKeys(workspaceId: string): Promise<ApiKeySummary[]> {
  return apiRequest(apiKeysPath(workspaceId), {
    schema: z.array(apiKeySummarySchema),
  });
}

/**
 * Creates a key. The answer carries the plaintext key exactly once.
 * 403: the caller asked for a permission they do not hold (or lacks `ai:manage_keys`). 409: 20 active keys
 * already. 429: strictly rate limited.
 */
export function createApiKey(
  workspaceId: string,
  input: CreateApiKeyRequest,
): Promise<CreatedApiKey> {
  return apiRequest(apiKeysPath(workspaceId), {
    method: "POST",
    body: input,
    schema: createdApiKeySchema,
  });
}

/** 204. Idempotent, and takes effect on the key's next request. 404 when the key is not in the workspace. */
export function revokeApiKey(workspaceId: string, keyId: string): Promise<void> {
  return apiRequestVoid(`${apiKeysPath(workspaceId)}/${encodeURIComponent(keyId)}`, {
    method: "DELETE",
  });
}
