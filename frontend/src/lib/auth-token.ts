const STORAGE_KEY = "syntra:access-token";

// Used only when `localStorage` is unavailable (private window, blocked site data).
let fallbackToken: string | null = null;

/**
 * The short-lived access token. It is kept in `localStorage` so a page reload and other tabs reuse it
 * instead of calling `/authentication/refresh`; the refresh call only happens once the gateway
 * answers 401. The refresh token itself stays in an httpOnly cookie that scripts cannot read.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return fallbackToken;
  }
}

export function setAccessToken(token: string | null): void {
  fallbackToken = token;
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (token === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, token);
    }
  } catch {
    // Not persisted; the in-memory copy still serves this tab.
  }
}
