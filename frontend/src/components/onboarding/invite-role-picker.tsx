"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { INVITE_ROLE_OPTIONS } from "@/lib/invite-roles";
import { cn } from "@/lib/utils";
import { inviteRoleSchema } from "@/types/schema";
import type { InviteRoleKey } from "@/types/onboarding";

type InviteRolePickerProps = {
  value: InviteRoleKey;
  onChange: (value: InviteRoleKey) => void;
  disabled: boolean;
};

/** Admin, Member or Viewer, each with a one-line description. The owner role can never be offered. */
export function InviteRolePicker({ value, onChange, disabled }: InviteRolePickerProps) {
  return (
    <RadioGroup
      value={value}
      disabled={disabled}
      aria-label="Role"
      onValueChange={(next) => {
        const parsed = inviteRoleSchema.safeParse(next);
        if (parsed.success) {
          onChange(parsed.data);
        }
      }}
      className="gap-2"
    >
      {INVITE_ROLE_OPTIONS.map((option) => {
        const selected = option.key === value;
        return (
          <label
            key={option.key}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-card text-left transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary",
              selected
                ? "border-2 border-primary bg-background p-[11px]"
                : "border border-border bg-surface p-3 hover:bg-background",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <RadioGroupItem value={option.key} className="mt-0.5" />
            <span className="flex flex-col">
              <span className="text-xs leading-4 font-medium text-foreground">
                {option.label}
              </span>
              <span className="text-xs leading-[18px] text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}
