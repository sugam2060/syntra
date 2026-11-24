import { Skeleton } from "@/components/ui/skeleton";

const ROWS = [0, 1, 2, 3];

/** Placeholder rows while the keys load: table-like on wide screens, cards on narrow ones. */
export function ApiKeysSkeleton() {
  return (
    <div role="status" aria-label="Loading API keys" className="divide-y divide-border">
      {ROWS.map((row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="hidden h-5 w-24 xl:block" />
          <Skeleton className="hidden h-4 w-24 xl:block" />
          <Skeleton className="ml-auto h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
