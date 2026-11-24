import { Button } from "@/components/ui/button";

type EntryErrorProps = {
  onRetry: () => void;
};

/** The workspace list could not be loaded (server unreachable or failing). Signed-out users never see this: they are sent to sign in. */
export function EntryError({ onRetry }: EntryErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div
        role="alert"
        className="flex w-full max-w-[400px] flex-col items-center gap-4 text-center"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
            Couldn&apos;t open your workspace
          </h1>
          <p className="text-sm leading-[21px] text-muted-foreground">
            We couldn&apos;t reach the server. Check your connection and try again.
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={onRetry}
          className="h-10 px-6 hover:bg-primary-hover sm:h-9"
        >
          Try again
        </Button>
      </div>
    </main>
  );
}
