import { cn } from "@/lib/utils";

type KeyUsageMeterProps = {
  active: number;
  max: number;
};

/** "N of 20 active keys" with a thin 120px bar. Turns amber at the limit. */
export function KeyUsageMeter({ active, max }: KeyUsageMeterProps) {
  const atLimit = active >= max;
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-foreground">
        <span className="font-mono tabular-nums">{active}</span> of{" "}
        <span className="font-mono tabular-nums">{max}</span> active keys
      </p>
      <progress
        value={active}
        max={max}
        aria-label="Active keys used"
        className={cn(
          "h-1 w-[120px] appearance-none overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary",
          atLimit && "[&::-moz-progress-bar]:bg-warning [&::-webkit-progress-value]:bg-warning",
        )}
      />
    </div>
  );
}
