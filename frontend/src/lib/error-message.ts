import { ApiError } from "@/lib/api-error";

/** The gateway's own message for an API error (403 and 409 explain themselves), otherwise the fallback. */
export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
