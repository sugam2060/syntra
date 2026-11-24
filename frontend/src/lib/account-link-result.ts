import { ACCOUNT_PATH } from "@/lib/workspace-paths";
import {
  ACCOUNT_LINK_RESULT,
  type AccountLinkResult,
  type AccountSecuritySearchParams,
} from "@/types/account-security";

const LINKED_PARAM = "linked";
const ERROR_PARAM = "error";
const LINKED_GOOGLE_VALUE = "google";

/** Values of `?error=` the gateway's Google callback uses. */
export const LINK_ERROR_VALUE = {
  linkFailed: "oauth_link_failed",
  oauthFailed: "oauth_failed",
} as const;

/** Where the sign-in callback sends a user who is already signed in after a link attempt. */
export const ACCOUNT_LINK_PATH = {
  linked: `${ACCOUNT_PATH.security}?${LINKED_PARAM}=${LINKED_GOOGLE_VALUE}`,
  linkFailed: `${ACCOUNT_PATH.security}?${ERROR_PARAM}=${LINK_ERROR_VALUE.linkFailed}`,
} as const;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Maps the query string of `/account/security` to a result banner. Unknown or missing values give
 * `null`, and the raw value is never rendered. `error` wins over `linked`.
 */
export function resolveLinkResult(
  params: AccountSecuritySearchParams,
): AccountLinkResult | null {
  const error = firstValue(params[ERROR_PARAM]);
  if (error === LINK_ERROR_VALUE.linkFailed) {
    return ACCOUNT_LINK_RESULT.alreadyLinked;
  }
  if (error === LINK_ERROR_VALUE.oauthFailed) {
    return ACCOUNT_LINK_RESULT.failed;
  }
  if (error === undefined && firstValue(params[LINKED_PARAM]) === LINKED_GOOGLE_VALUE) {
    return ACCOUNT_LINK_RESULT.linked;
  }
  return null;
}

/** Fixed copy for each result. */
export const LINK_RESULT_MESSAGES: Record<AccountLinkResult, string> = {
  [ACCOUNT_LINK_RESULT.linked]: "Google account linked.",
  [ACCOUNT_LINK_RESULT.alreadyLinked]:
    "That Google account is already linked to another user.",
  [ACCOUNT_LINK_RESULT.failed]: "Couldn't link Google. Try again.",
};
