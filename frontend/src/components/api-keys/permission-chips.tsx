import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const VISIBLE_CHIPS = 2;
const CHIP_CLASS =
  "inline-flex h-5 items-center rounded-md border border-border bg-muted px-1.5 font-mono text-xs text-foreground";

type PermissionChipsProps = {
  permissions: readonly string[];
  /** List every code instead of two and a "+N" tooltip. */
  showAll?: boolean;
};

/** Up to two permission codes as mono chips, then "+N" with a tooltip that lists the rest. */
export function PermissionChips({ permissions, showAll = false }: PermissionChipsProps) {
  const visible = showAll ? permissions : permissions.slice(0, VISIBLE_CHIPS);
  const hidden = showAll ? [] : permissions.slice(VISIBLE_CHIPS);

  return (
    <ul className="flex flex-wrap items-center gap-1" aria-label="Permissions">
      {visible.map((permission) => (
        <li key={permission} className={CHIP_CLASS}>
          {permission}
        </li>
      ))}
      {hidden.length > 0 && (
        <li>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={`${hidden.length} more: ${hidden.join(", ")}`}
                  className={cn(
                    CHIP_CLASS,
                    "cursor-default outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                />
              }
            >
              +{hidden.length}
            </TooltipTrigger>
            <TooltipContent className="flex-col items-start gap-0.5 font-mono">
              {hidden.map((permission) => (
                <span key={permission}>{permission}</span>
              ))}
            </TooltipContent>
          </Tooltip>
        </li>
      )}
    </ul>
  );
}
