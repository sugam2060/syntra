import { StatusPill } from "@/components/members/status-pill";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import type { InviteResult } from "@/types/shared";

const OUTCOME_LABELS: Record<InviteResult["outcome"], { label: string; tone: "success" | "neutral" }> = {
  invited: { label: "Invited", tone: "success" },
  already_member: { label: "Already a member", tone: "neutral" },
  already_invited: { label: "Already invited", tone: "neutral" },
};

type InviteResultsProps = {
  results: readonly InviteResult[];
};

/** What happened to each address of a bulk invite. */
export function InviteResults({ results }: InviteResultsProps) {
  return (
    <div className="flex flex-col gap-4">
      <ul
        aria-label="Invite results"
        className="overflow-hidden rounded-card border border-border"
      >
        {results.map((result) => {
          const outcome = OUTCOME_LABELS[result.outcome];
          return (
            <li
              key={result.email}
              className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
            >
              <span className="min-w-0 truncate text-sm leading-5 text-foreground">{result.email}</span>
              <StatusPill tone={outcome.tone}>{outcome.label}</StatusPill>
            </li>
          );
        })}
      </ul>
      <DialogFooter>
        <DialogClose render={<Button type="button" />}>Done</DialogClose>
      </DialogFooter>
    </div>
  );
}
