import { LuCheck, LuMinus } from "react-icons/lu";

import { OverrideChoiceControl } from "@/components/members/override-choice-control";
import { cn } from "@/lib/utils";
import type { OverrideChoice } from "@/types/members";
import type { PermissionInfo } from "@/types/shared";

type OverrideRowProps = {
  permission: PermissionInfo;
  /** Whether the member's role already grants this permission. */
  grantedByRole: boolean;
  value: OverrideChoice;
  saved: OverrideChoice;
  callerHolds: boolean;
  disabled: boolean;
  onChange: (choice: OverrideChoice) => void;
};

/** One permission: its code and description, whether the role grants it, and the override choice. Changed rows are tinted. */
export function OverrideRow({
  permission,
  grantedByRole,
  value,
  saved,
  callerHolds,
  disabled,
  onChange,
}: OverrideRowProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0",
        value !== saved && "bg-accent/60",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <code className="font-mono text-[13px] leading-5 text-foreground">{permission.key}</code>
        <span className="text-xs leading-[18px] text-muted-foreground">
          {permission.description}
        </span>
      </div>
      <span
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center",
          grantedByRole ? "text-success" : "text-muted-foreground",
        )}
      >
        {grantedByRole ? (
          <LuCheck className="size-4" aria-hidden="true" />
        ) : (
          <LuMinus className="size-4" aria-hidden="true" />
        )}
        <span className="sr-only">{grantedByRole ? "Granted by role" : "Not granted by role"}</span>
      </span>
      <OverrideChoiceControl
        permissionKey={permission.key}
        value={value}
        saved={saved}
        callerHolds={callerHolds}
        disabled={disabled}
        onChange={onChange}
      />
    </li>
  );
}
