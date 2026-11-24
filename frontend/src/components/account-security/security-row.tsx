import { cn } from "@/lib/utils";

type SecurityRowProps = {
  /** Icon or mark shown in the 36px square. */
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: string;
  /** Button or badge at the end of the row. Under the text on small screens, aligned with it. */
  action?: React.ReactNode;
  className?: string;
};

/** An icon square, a title with an optional muted line, and an action. */
export function SecurityRow({
  icon,
  title,
  description,
  action,
  className,
}: SecurityRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground [&_svg]:size-[18px]"
        >
          {icon}
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="text-sm leading-5 font-medium break-words text-foreground">
            {title}
          </p>
          {description && (
            <p className="text-xs leading-[18px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="ml-12 flex shrink-0 sm:ml-0">{action}</div>}
    </div>
  );
}
