"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthBanner } from "@/components/shared/auth-banner";
import { LINK_RESULT_MESSAGES } from "@/lib/account-link-result";
import { ACCOUNT_PATH } from "@/lib/workspace-paths";
import {
  ACCOUNT_LINK_RESULT,
  type AccountLinkResult,
} from "@/types/account-security";
import { AUTH_BANNER_VARIANT } from "@/types/shared";

type LinkResultBannerProps = {
  /** Resolved on the server from the query string; `null` when there is nothing to show. */
  result: AccountLinkResult | null;
};

/**
 * Shows the outcome of the Google link flow once, then removes the query from the URL so a reload or
 * a shared link does not repeat it. The banner keeps its own copy of the result, because the server
 * hands this component `null` as soon as the query is gone.
 */
export function LinkResultBanner({ result }: LinkResultBannerProps) {
  const router = useRouter();
  const [shown, setShown] = useState<AccountLinkResult | null>(result);
  const [seen, setSeen] = useState<AccountLinkResult | null>(result);

  if (result !== seen) {
    setSeen(result);
    if (result !== null) {
      setShown(result);
    }
  }

  useEffect(() => {
    if (result !== null) {
      router.replace(ACCOUNT_PATH.security, { scroll: false });
    }
  }, [result, router]);

  if (shown === null) {
    return null;
  }
  return (
    <AuthBanner
      variant={
        shown === ACCOUNT_LINK_RESULT.linked
          ? AUTH_BANNER_VARIANT.success
          : AUTH_BANNER_VARIANT.danger
      }
    >
      {LINK_RESULT_MESSAGES[shown]}
    </AuthBanner>
  );
}
