import { LuCircle, LuCircleCheck } from "react-icons/lu";

import { PASSWORD_MIN_LENGTH } from "@/types/schema";
import { getPasswordStrength } from "@/lib/password-strength";
import { cn } from "@/lib/utils";
import type { PasswordStrengthScore } from "@/types/register";

const SEGMENT_COUNT = 4;

const FILL_BY_SCORE: Record<PasswordStrengthScore, string> = {
  0: "bg-border",
  1: "bg-destructive",
  2: "bg-warning",
  3: "bg-info",
  4: "bg-success",
};

/** The 4-segment meter and the "At least 10 characters" checklist row under the password field. */
export function PasswordStrength({ password }: { password: string }) {
  const score = getPasswordStrength(password);
  const lengthMet = password.length >= PASSWORD_MIN_LENGTH;
  const typing = password.length > 0;
  const ChecklistIcon = typing && !lengthMet ? LuCircle : LuCircleCheck;

  return (
    <>
      <div className="grid grid-cols-4 gap-1" aria-hidden="true">
        {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
          <div
            key={index}
            className={cn(
              "h-1 rounded-full transition-colors",
              index < score ? FILL_BY_SCORE[score] : "bg-border",
            )}
          />
        ))}
      </div>
      <div
        className={cn(
          "flex items-center gap-1 text-xs leading-[18px]",
          lengthMet ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <ChecklistIcon
          className={cn("size-4 shrink-0", lengthMet && "text-success")}
          aria-hidden="true"
        />
        <span>At least {PASSWORD_MIN_LENGTH} characters</span>
        <span className="sr-only">{lengthMet ? "(met)" : "(not met yet)"}</span>
      </div>
    </>
  );
}
