/** Shown for the moment it takes to find out where a signed-in user belongs. */
export function EntryLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3 text-center"
      >
        <div
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-[3px] border-accent border-t-primary motion-reduce:animate-none"
        />
        <p className="text-sm leading-[21px] text-muted-foreground">
          Opening your workspace…
        </p>
      </div>
    </main>
  );
}
