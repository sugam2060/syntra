import type { InviteResult } from "@/types/shared";

type InviteSummary = {
  invited: number;
  alreadyMembers: string[];
  alreadyInvited: string[];
};

/** Groups the per-address results of a bulk invite. */
export function summarizeInvites(results: InviteResult[]): InviteSummary {
  return {
    invited: results.filter((result) => result.outcome === "invited").length,
    alreadyMembers: results
      .filter((result) => result.outcome === "already_member")
      .map((result) => result.email),
    alreadyInvited: results
      .filter((result) => result.outcome === "already_invited")
      .map((result) => result.email),
  };
}

/** The sentence shown for addresses that were not invited, or null when every address was. */
export function describeSkippedInvites(summary: InviteSummary): string | null {
  const parts: string[] = [];
  if (summary.alreadyMembers.length > 0) {
    parts.push(`${summary.alreadyMembers.join(", ")} already in the workspace`);
  }
  if (summary.alreadyInvited.length > 0) {
    parts.push(`${summary.alreadyInvited.join(", ")} already invited`);
  }
  return parts.length > 0 ? `Skipped: ${parts.join("; ")}.` : null;
}
