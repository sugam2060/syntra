function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-border/60 ${className}`} />;
}

/** Shown while the search params (for example `?error=oauth_failed`) resolve. Mirrors the form's layout. */
export function LoginFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="flex flex-col gap-4">
        <SkeletonBlock className="h-10 sm:h-9" />
        <SkeletonBlock className="h-4" />
        <SkeletonBlock className="h-10 sm:h-9" />
        <SkeletonBlock className="h-10 sm:h-9" />
        <SkeletonBlock className="h-10 sm:h-9" />
      </div>
      <SkeletonBlock className="mx-auto h-5 w-48" />
    </div>
  );
}
