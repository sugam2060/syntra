import type { IconType } from "react-icons";
import { LuCircleAlert, LuCircleCheck, LuLink, LuLoaderCircle } from "react-icons/lu";

import { cn } from "@/lib/utils";
import { SLUG_FORMAT_MESSAGE } from "@/types/schema";
import { SLUG_STATUS, type SlugStatus } from "@/types/shared";

type StatusLine = {
  icon: IconType;
  text: string;
  className: string;
  iconClassName?: string;
};

const STATUS_LINES: Partial<Record<SlugStatus, StatusLine>> = {
  [SLUG_STATUS.current]: {
    icon: LuLink,
    text: "Current URL",
    className: "text-muted-foreground",
  },
  [SLUG_STATUS.checking]: {
    icon: LuLoaderCircle,
    text: "Checking…",
    className: "text-muted-foreground",
    iconClassName: "animate-spin motion-reduce:animate-none",
  },
  [SLUG_STATUS.available]: {
    icon: LuCircleCheck,
    text: "Available",
    className: "text-foreground",
    iconClassName: "text-success",
  },
  [SLUG_STATUS.taken]: {
    icon: LuCircleAlert,
    text: "Already taken",
    className: "text-destructive",
  },
  [SLUG_STATUS.reserved]: {
    icon: LuCircleAlert,
    text: "That URL is reserved. Try another.",
    className: "text-destructive",
  },
  [SLUG_STATUS.invalid]: {
    icon: LuCircleAlert,
    text: SLUG_FORMAT_MESSAGE,
    className: "text-destructive",
  },
};

/** One live line under the workspace URL field. Renders an empty, reserved-height row when there is nothing to say. */
export function SlugAvailabilityStatus({ status }: { status: SlugStatus }) {
  const line = STATUS_LINES[status];

  return (
    <div role="status" aria-live="polite" className="min-h-[18px] pt-1">
      {line && (
        <div className={cn("flex items-start gap-1 text-xs leading-[18px]", line.className)}>
          <line.icon
            className={cn("mt-px size-4 shrink-0", line.iconClassName)}
            aria-hidden="true"
          />
          <span>{line.text}</span>
        </div>
      )}
    </div>
  );
}
