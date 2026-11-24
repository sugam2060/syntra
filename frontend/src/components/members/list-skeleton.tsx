import { Skeleton } from "@/components/ui/skeleton";

type ListSkeletonProps = {
  /** Accessible name of what is loading. */
  label: string;
  rows?: number;
};

/** Placeholder rows while a list loads: 48px rows with an avatar and two text lines. */
export function ListSkeleton({ label, rows = 5 }: ListSkeletonProps) {
  return (
    <div
      role="status"
      aria-label={`Loading ${label}`}
      className="overflow-hidden rounded-card border border-border"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex h-12 items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
          <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}
