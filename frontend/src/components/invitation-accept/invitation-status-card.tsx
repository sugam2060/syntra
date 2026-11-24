import type { IconType } from "react-icons";

import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import type { AuthStatusTone } from "@/types/shared";

type InvitationStatusCardProps = {
  icon: IconType;
  tone: AuthStatusTone;
  title: string;
  description: React.ReactNode;
  /** `alert` for problems and refusals, `status` for neutral and positive outcomes. */
  announce: "alert" | "status";
  /** Actions under the message. */
  children?: React.ReactNode;
};

/** Frame of every terminal state (expired, withdrawn, accepted, invalid, errors): tinted icon, H1, one line of guidance, actions. */
export function InvitationStatusCard({
  icon,
  tone,
  title,
  description,
  announce,
  children,
}: InvitationStatusCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <AuthStatusIcon icon={icon} tone={tone} />
      <div role={announce} className="flex flex-col gap-2">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-balance text-foreground">
          {title}
        </h1>
        <p className="text-sm leading-[21px] text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      {children !== undefined && (
        <div className="flex w-full flex-col gap-2">{children}</div>
      )}
    </div>
  );
}
