function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-border/60 ${className}`} />;
}

/** Shown while the `token` search parameter resolves. Mirrors the form's layout. */
export function ResetPasswordSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <SkeletonBlock className="h-7 w-48" />
      <SkeletonBlock className="h-10 sm:h-9" />
      <SkeletonBlock className="h-10 sm:h-9" />
      <SkeletonBlock className="h-10 sm:h-9" />
    </div>
  );
}
