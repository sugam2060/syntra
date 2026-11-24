import { ApiError } from "@/lib/api-error";
import type { CreateApiKeyError } from "@/types/api-keys";

/** Maps a failed create request to what the dialog shows. */
export function describeCreateKeyError(error: unknown): CreateApiKeyError {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return { kind: "forbidden" };
    }
    if (error.status === 409) {
      return { kind: "limit-reached" };
    }
    if (error.status === 429) {
      return { kind: "rate-limited" };
    }
    return { kind: "error", message: error.message };
  }
  return { kind: "error", message: "Something went wrong. Try again." };
}
