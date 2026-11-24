import { z } from "zod";

import { ApiError, apiErrorBodySchema } from "@/lib/api-error";
import { getAccessToken, setAccessToken } from "@/lib/auth-token";
import { env } from "@/lib/env";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  /** Attach the Bearer token and refresh once on a 401. Set false for public routes. Default true. */
  auth?: boolean;
  /** Send the browser to `/login` when the session cannot be restored. Set false to just get the 401. Default true. */
  redirectOnAuthFailure?: boolean;
};

const refreshResponseSchema = z.object({ accessToken: z.string() });

const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your connection and try again.";

// One refresh at a time: parallel refreshes look like token reuse to the gateway and revoke every session.
let refreshInFlight: Promise<boolean> | null = null;

// Held while a refresh runs, so tabs sharing the stored token never refresh at the same time.
const REFRESH_LOCK_NAME = "syntra:refresh";

function url(path: string): string {
  return `${env.NEXT_PUBLIC_API_URL}${path}`;
}

async function fetchOrThrow(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: NETWORK_ERROR_MESSAGE,
    });
  }
}

async function runRefresh(): Promise<boolean> {
  const response = await fetchOrThrow(url("/authentication/refresh"), {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    setAccessToken(null);
    return false;
  }
  const parsed = refreshResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    setAccessToken(null);
    return false;
  }
  setAccessToken(parsed.data.accessToken);
  return true;
}

async function refreshUnlessAlreadyRenewed(staleToken: string | null): Promise<boolean> {
  const current = getAccessToken();
  // Another request or tab renewed the token while this one waited, so rotating again would look
  // like token reuse. Use the new token.
  if (current !== null && current !== staleToken) {
    return true;
  }
  return runRefresh();
}

async function refreshWithLock(staleToken: string | null): Promise<boolean> {
  if (typeof navigator === "undefined" || !("locks" in navigator)) {
    return refreshUnlessAlreadyRenewed(staleToken);
  }
  return navigator.locks.request(REFRESH_LOCK_NAME, async () =>
    refreshUnlessAlreadyRenewed(staleToken),
  );
}

/**
 * Trades the refresh cookie for a new access token. Concurrent callers in this tab share one request
 * (single-flight), and the Web Locks API keeps other tabs from refreshing at the same moment.
 * `staleToken` is the token the caller just saw rejected; it defaults to the current one. Resolves
 * false when the session can't be restored.
 */
export function refreshAccessToken(staleToken: string | null = getAccessToken()): Promise<boolean> {
  refreshInFlight ??= refreshWithLock(staleToken).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function redirectToLogin(): void {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    // A full navigation on purpose: it also drops all in-memory query state.
    window.location.assign(new URL("/login", window.location.origin).href);
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const parsed = apiErrorBodySchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!parsed.success) {
    return new ApiError({
      status: response.status,
      code: null,
      message: `Request failed (${response.status}).`,
    });
  }
  const { message, error } = parsed.data;
  return new ApiError({
    status: response.status,
    code: error ?? null,
    message: Array.isArray(message) ? message.join(", ") : message,
  });
}

async function send(
  path: string,
  { method = "GET", body, auth = true, redirectOnAuthFailure = true }: RequestOptions,
  isRetry = false,
): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const token = auth ? getAccessToken() : null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetchOrThrow(url(path), {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401 && auth && !isRetry) {
    if (await refreshAccessToken(token)) {
      return send(path, { method, body, auth, redirectOnAuthFailure }, true);
    }
    if (redirectOnAuthFailure) {
      redirectToLogin();
    }
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response;
}

/** Calls the gateway and parses the JSON response with the given Zod schema. */
export async function apiRequest<TSchema extends z.ZodType>(
  path: string,
  options: RequestOptions & { schema: TSchema },
): Promise<z.infer<TSchema>> {
  const response = await send(path, options);
  return options.schema.parse(await response.json());
}

/** Calls the gateway for endpoints that answer with no body (202/204). */
export async function apiRequestVoid(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  await send(path, options);
}
