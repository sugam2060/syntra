import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder with the shape of the invitation card, shown while the preview and the session load. No spinner. */
export function InvitationAcceptSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">Loading your invitation</span>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-12 rounded-xl" />
          <Skeleton className="h-[22px] w-4/5" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex flex-col gap-4 rounded-card border bg-surface p-4">
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
          <Skeleton className="h-4" />
        </div>
        <Skeleton className="h-10 sm:h-9" />
      </div>
    </div>
  );
}
