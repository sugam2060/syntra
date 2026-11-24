import type { IconType } from "react-icons";
import { LuCircle, LuCircleCheck } from "react-icons/lu";

import { cn } from "@/lib/utils";
import type { StartOption } from "@/types/onboarding";

type StartOptionCardProps = {
  value: StartOption;
  selected: boolean;
  onSelect: (value: StartOption) => void;
  icon: IconType;
  title: string;
  description: string;
};

/** One of the two large selectable cards. A native radio keeps arrow-key and screen reader behavior. */
export function StartOptionCard({
  value,
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
}: StartOptionCardProps) {
  return (
    <label className="block h-full w-full cursor-pointer">
      <input
        type="radio"
        name="start-option"
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <div
        className={cn(
          "flex h-full flex-col gap-3 rounded-card text-left transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary",
          selected
            ? "border-2 border-primary bg-background p-[23px] hover:bg-surface"
            : "border border-border bg-surface p-6 hover:border-muted-foreground hover:bg-background",
        )}
      >
        <div className="flex w-full items-center justify-between">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              selected
                ? "bg-accent text-primary"
                : "border border-border bg-background text-muted-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
          {selected ? (
            <LuCircleCheck className="size-5 text-primary" aria-hidden="true" />
          ) : (
            <LuCircle className="size-5 text-border" aria-hidden="true" />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[15px] leading-[22px] font-semibold text-foreground">
            {title}
          </span>
          <span className="text-sm leading-[21px] break-words text-muted-foreground">
            {description}
          </span>
        </div>
      </div>
    </label>
  );
}
