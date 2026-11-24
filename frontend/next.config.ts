import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** Origin of the gateway, the only other place the browser may send requests to. */
function apiOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return null;
  }
}

/**
 * Content Security Policy for every page. It limits where scripts, requests and images may come from, so
 * script that slips into a page (XSS) cannot send the stored access token to another server.
 *
 * Nonces would also block injected inline scripts, but they force every page to render dynamically and
 * do not work with Partial Prerendering, which this app uses (see the Next.js CSP guide). Next.js itself
 * relies on inline scripts, hence `'unsafe-inline'` for scripts and styles.
 */
function contentSecurityPolicy(): string {
  const connectSources = ["'self'", apiOrigin(), ...(isDev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : [])];
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Avatars come from the Google profile picture host.
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    "font-src 'self' data:",
    `connect-src ${connectSources.filter(Boolean).join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
