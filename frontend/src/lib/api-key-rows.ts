import { describeKeyExpiry, describeLastUsed } from "@/lib/api-key-display";
import { formatKeyDate } from "@/lib/api-key-expiry";
import { getApiKeyStatus } from "@/lib/api-key-status";
import { resolveKeyCreator } from "@/lib/key-creator";
import type { ApiKeyRow } from "@/types/api-keys";
import type { ApiKeySummary, WorkspaceMember } from "@/types/shared";

type BuildRowsOptions = {
  /** Epoch milliseconds, passed in so rendering stays pure. */
  now: number;
  members: ReadonlyMap<string, WorkspaceMember> | null;
  membersLoading: boolean;
};

/** Turns the gateway's summaries into the rows the page renders. */
export function buildApiKeyRows(
  keys: readonly ApiKeySummary[],
  { now, members, membersLoading }: BuildRowsOptions,
): ApiKeyRow[] {
  return keys.map((key) => ({
    key,
    status: getApiKeyStatus(key, now),
    expiry: describeKeyExpiry(key, now),
    createdLabel: formatKeyDate(key.createdAt),
    lastUsedLabel: describeLastUsed(key.lastUsedAt, now),
    neverUsed: key.lastUsedAt === null,
    creator: resolveKeyCreator(key.createdBy, members, membersLoading),
  }));
}
