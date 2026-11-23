import type { IconType } from "react-icons";

import { cn } from "@/lib/utils";
import { AUTH_STATUS_TONE, type AuthStatusTone } from "@/types/shared";

const TONE_STYLES: Record<AuthStatusTone, string> = {
  [AUTH_STATUS_TONE.primary]: "bg-accent text-primary",
  [AUTH_STATUS_TONE.success]: "bg-success/10 text-success",
  [AUTH_STATUS_TONE.warning]: "bg-warning/10 text-warning",
};

type AuthStatusIconProps = {
  icon: IconType;
  tone: AuthStatusTone;
};

/** The 56px tinted circle that tops every "check your email", "done" and "link expired" state. */
export function AuthStatusIcon({ icon: Icon, tone }: AuthStatusIconProps) {
  return (
    <div
      className={cn(
        "flex size-14 items-center justify-center rounded-full",
        TONE_STYLES[tone],
      )}
    >
      <Icon className="size-7" aria-hidden="true" />
    </div>
  );
}
