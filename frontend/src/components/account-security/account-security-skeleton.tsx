import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 4;

/** Four placeholder cards with the same rhythm as the real ones. */
export function AccountSecuritySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading security settings"
      className="flex flex-col gap-4"
    >
      {Array.from({ length: ROW_COUNT }, (_, index) => (
        <Card
          key={index}
          aria-hidden="true"
          className="gap-3 rounded-card border border-border py-4 shadow-none ring-0"
        >
          <Skeleton className="mx-4 h-4 w-24" />
          <div className="mx-4 flex items-center gap-3">
            <Skeleton className="size-9 shrink-0" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="hidden h-9 w-32 sm:block" />
          </div>
        </Card>
      ))}
    </div>
  );
}
