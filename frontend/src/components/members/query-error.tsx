import { LuCircleAlert } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/error-message";

type QueryErrorProps = {
  /** What failed to load, for example "members". */
  subject: string;
  error: unknown;
  onRetry: () => void;
};

/** Inline error for a list that failed to load, with the gateway's message and a retry button. */
export function QueryError({ subject, error, onRetry }: QueryErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-card border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center"
    >
      <LuCircleAlert className="size-5 shrink-0 text-destructive" aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-sm leading-5 font-medium text-foreground">Couldn&apos;t load {subject}</p>
        <p className="text-xs leading-[18px] text-muted-foreground">
          {getErrorMessage(error, "Something went wrong. Try again.")}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
