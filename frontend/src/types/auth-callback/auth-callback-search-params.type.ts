/** The raw query string the gateway redirects with, as Next.js hands it to the page. */
export type AuthCallbackSearchParams = Record<
  string,
  string | string[] | undefined
>;
