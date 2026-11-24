"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TEAM_SIZE_OPTIONS, type TeamSize } from "@/types/onboarding";

type TeamSizeControlProps = {
  value: TeamSize | null;
  onChange: (value: TeamSize | null) => void;
  disabled: boolean;
};

/** Optional segmented control. Choosing the selected option again clears it. */
export function TeamSizeControl({ value, onChange, disabled }: TeamSizeControlProps) {
  return (
    <ToggleGroup
      aria-label="Team size"
      spacing={1}
      disabled={disabled}
      value={value ? [value] : []}
      onValueChange={(next) => {
        const picked = TEAM_SIZE_OPTIONS.find((option) => option.value === next[0]);
        onChange(picked ? picked.value : null);
      }}
      className="grid w-full grid-cols-3 rounded-lg border border-border bg-surface p-1"
    >
      {TEAM_SIZE_OPTIONS.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="h-8 rounded-md text-xs leading-4 font-medium text-muted-foreground hover:text-foreground aria-pressed:border aria-pressed:border-border aria-pressed:bg-background aria-pressed:text-foreground"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
