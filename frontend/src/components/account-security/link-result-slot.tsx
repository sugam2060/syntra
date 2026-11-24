import { LinkResultBanner } from "@/components/account-security/link-result-banner";
import { resolveLinkResult } from "@/lib/account-link-result";
import type { AccountSecuritySearchParams } from "@/types/account-security";

type LinkResultSlotProps = {
  searchParams: Promise<AccountSecuritySearchParams>;
};

/** Reads the query string on the server and hands the resolved result to the client banner. Render inside Suspense. */
export async function LinkResultSlot({ searchParams }: LinkResultSlotProps) {
  return <LinkResultBanner result={resolveLinkResult(await searchParams)} />;
}
