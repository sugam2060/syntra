import { LuCrown } from "react-icons/lu";

import { cn } from "@/lib/utils";

type RolePillProps = {
  name: string;
  isOwner?: boolean;
  className?: string;
};

/** Read-only role label. The owner gets a crown, because that role is fixed. */
export function RolePill({ name, isOwner = false, className }: RolePillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground",
        className,
      )}
    >
      {isOwner && <LuCrown className="size-3.5 text-warning" aria-hidden="true" />}
      {name}
    </span>
  );
}
