import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PermissionInfo } from "@/types/shared";

type PermissionOptionProps = {
  permission: PermissionInfo;
  checked: boolean;
  /** False when the caller does not hold this permission themselves. */
  grantable: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/** A checkbox with the mono code and what it allows. Without the permission it is disabled, with a tooltip. */
export function PermissionOption({
  permission,
  checked,
  grantable,
  disabled,
  onCheckedChange,
}: PermissionOptionProps) {
  const isDisabled = disabled || !grantable;
  const id = `permission-${permission.key.replace(":", "-")}`;

  const row = (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 rounded-md px-2 py-2",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-muted",
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={isDisabled}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-[13px] leading-5 text-foreground">{permission.key}</span>
        <span className="text-xs leading-[18px] text-muted-foreground">{permission.description}</span>
        {!grantable && <span className="sr-only">You don&apos;t have this permission.</span>}
      </span>
    </label>
  );

  if (grantable) {
    return row;
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{row}</TooltipTrigger>
      <TooltipContent>You don&apos;t have this permission</TooltipContent>
    </Tooltip>
  );
}
