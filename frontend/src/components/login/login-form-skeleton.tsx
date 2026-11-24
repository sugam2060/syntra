import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the search params (for example `?error=oauth_failed`) resolve. Mirrors the form's layout. */
export function LoginFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 sm:h-9" />
        <Skeleton className="h-4" />
        <Skeleton className="h-10 sm:h-9" />
        <Skeleton className="h-10 sm:h-9" />
        <Skeleton className="h-10 sm:h-9" />
      </div>
      <Skeleton className="mx-auto h-5 w-48" />
    </div>
  );
}
