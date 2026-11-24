import { LuCircleAlert, LuRefreshCw } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApiError } from "@/lib/api-error";

type AccountSecurityErrorProps = {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
};

/** Shown when the profile could not be loaded, with one way forward. */
export function AccountSecurityError({
  error,
  onRetry,
  retrying,
}: AccountSecurityErrorProps) {
  const unreachable = error instanceof ApiError && error.status === 0;

  return (
    <Card
      role="alert"
      className="items-start gap-3 rounded-card border border-border px-4 py-4 shadow-none ring-0"
    >
      <div className="flex items-start gap-3">
        <LuCircleAlert
          className="mt-0.5 size-[18px] shrink-0 text-destructive"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1">
          <h2 className="text-sm leading-5 font-semibold text-foreground">
            Couldn&apos;t load your security settings
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            {unreachable
              ? "Can't reach the server. Check your connection and try again."
              : "Something went wrong on our side. Try again."}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        disabled={retrying}
        onClick={onRetry}
        className="h-10 gap-2 px-4 sm:h-9"
      >
        <LuRefreshCw aria-hidden="true" className={retrying ? "animate-spin" : undefined} />
        Try again
      </Button>
    </Card>
  );
}
