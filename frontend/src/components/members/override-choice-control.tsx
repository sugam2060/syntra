"use client";

import { Fragment } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { OVERRIDE_CHOICE } from "@/types/members";
import type { OverrideChoice } from "@/types/members";

const CHOICES: ReadonlyArray<{ value: OverrideChoice; label: string }> = [
  { value: OVERRIDE_CHOICE.default, label: "Default" },
  { value: OVERRIDE_CHOICE.allow, label: "Allow" },
  { value: OVERRIDE_CHOICE.deny, label: "Deny" },
];

/**
 * Which choices the caller may pick. Allowing a permission needs holding it, and so does lifting a
 * saved deny (back to default or to allow), because both hand the permission back.
 */
function isChoiceDisabled(
  choice: OverrideChoice,
  saved: OverrideChoice,
  callerHolds: boolean,
): boolean {
  if (callerHolds) {
    return false;
  }
  if (choice === OVERRIDE_CHOICE.allow) {
    return saved !== OVERRIDE_CHOICE.allow;
  }
  if (choice === OVERRIDE_CHOICE.default) {
    return saved === OVERRIDE_CHOICE.deny;
  }
  return false;
}

type OverrideChoiceControlProps = {
  permissionKey: string;
  value: OverrideChoice;
  /** What is saved on the gateway now. */
  saved: OverrideChoice;
  callerHolds: boolean;
  disabled: boolean;
  onChange: (choice: OverrideChoice) => void;
};

const SELECTED_CLASS: Record<OverrideChoice, string> = {
  [OVERRIDE_CHOICE.default]: "aria-pressed:bg-muted aria-pressed:text-foreground aria-pressed:ring-1 aria-pressed:ring-border",
  [OVERRIDE_CHOICE.allow]: "aria-pressed:bg-success/15 aria-pressed:text-success",
  [OVERRIDE_CHOICE.deny]: "aria-pressed:bg-destructive/15 aria-pressed:text-destructive",
};

/** Three-way segmented control: Default (no override), Allow or Deny. */
export function OverrideChoiceControl({
  permissionKey,
  value,
  saved,
  callerHolds,
  disabled,
  onChange,
}: OverrideChoiceControlProps) {
  return (
    <ToggleGroup
      aria-label={`Override for ${permissionKey}`}
      spacing={0}
      value={[value]}
      onValueChange={(next) => {
        const picked = CHOICES.find((choice) => choice.value === next[0]);
        // Pressing the selected choice would clear the group; one choice is always active.
        if (picked) {
          onChange(picked.value);
        }
      }}
      className="shrink-0 rounded-md border border-border bg-background p-0.5 dark:bg-surface"
    >
      {CHOICES.map((choice) => {
        const blocked = isChoiceDisabled(choice.value, saved, callerHolds);
        const item = (
          <ToggleGroupItem
            value={choice.value}
            disabled={disabled || blocked}
            className={cn(
              "h-6 min-w-0 rounded-[4px] px-2 text-xs leading-4 font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
              SELECTED_CLASS[choice.value],
            )}
          >
            {choice.label}
          </ToggleGroupItem>
        );
        if (!blocked) {
          return <Fragment key={choice.value}>{item}</Fragment>;
        }
        return (
          <Tooltip key={choice.value}>
            <TooltipTrigger render={<span tabIndex={0} className="inline-flex rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ring" />}>
              {item}
            </TooltipTrigger>
            <TooltipContent>You don&apos;t have this permission</TooltipContent>
          </Tooltip>
        );
      })}
    </ToggleGroup>
  );
}
