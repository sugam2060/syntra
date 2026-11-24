import { Skeleton } from "@/components/ui/skeleton";

/** Shown while the `token` search parameter resolves. Mirrors the form's layout. */
export function ResetPasswordSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-10 sm:h-9" />
      <Skeleton className="h-10 sm:h-9" />
      <Skeleton className="h-10 sm:h-9" />
    </div>
  );
}
