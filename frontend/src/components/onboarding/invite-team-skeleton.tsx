import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while the workspace and roles load, and the Suspense fallback while the URL is read. */
export function InviteTeamSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="grid w-full max-w-[960px] grid-cols-1 gap-12 lg:grid-cols-12"
    >
      <div className="flex flex-col gap-8 lg:col-span-7">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[30px] w-48" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 rounded-lg" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-[58px] rounded-card" />
          ))}
        </div>
      </div>
      <Skeleton className="hidden h-64 rounded-card lg:col-span-5 lg:block" />
    </div>
  );
}
