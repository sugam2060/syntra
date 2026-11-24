import { Button } from "@/components/ui/button";

type WorkspaceLoadErrorProps = {
  onRetry: () => void;
};

/** The workspace could not be loaded for a reason other than "not found" (server unreachable or failing). */
export function WorkspaceLoadError({ onRetry }: WorkspaceLoadErrorProps) {
  return (
    <div role="alert" className="flex w-full max-w-[460px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          Couldn&apos;t open this workspace
        </h1>
        <p className="text-sm leading-[21px] text-muted-foreground">
          We couldn&apos;t reach the server. Check your connection and try again.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        onClick={onRetry}
        className="h-10 w-fit px-6 hover:bg-primary-hover sm:h-9"
      >
        Try again
      </Button>
    </div>
  );
}
