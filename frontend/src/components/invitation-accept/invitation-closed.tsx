import Link from "next/link";
import type { IconType } from "react-icons";
import { LuCheck, LuCircleX, LuClock } from "react-icons/lu";

import { InvitationStatusCard } from "@/components/invitation-accept/invitation-status-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvitationClosedStatus } from "@/types/invitation-accept";
import { AUTH_STATUS_TONE, type AuthStatusTone } from "@/types/shared";

type ClosedCopy = {
  icon: IconType;
  tone: AuthStatusTone;
  title: string;
  description: (workspaceName: string) => string;
  announce: "alert" | "status";
};

const COPY: Record<InvitationClosedStatus, ClosedCopy> = {
  expired: {
    icon: LuClock,
    tone: AUTH_STATUS_TONE.warning,
    title: "This invitation has expired",
    description: () => "Ask the person who invited you to send a new one.",
    announce: "alert",
  },
  revoked: {
    icon: LuCircleX,
    tone: AUTH_STATUS_TONE.danger,
    title: "This invitation was canceled",
    description: () => "Ask a workspace admin to send you a new invitation.",
    announce: "alert",
  },
  accepted: {
    icon: LuCheck,
    tone: AUTH_STATUS_TONE.success,
    title: "This invitation was already accepted",
    description: (workspaceName) => `${workspaceName} is ready when you are.`,
    announce: "status",
  },
};

type InvitationClosedProps = {
  status: InvitationClosedStatus;
  workspaceName: string;
  signedIn: boolean;
};

/** The invitation can no longer be accepted. The invited address is deliberately not shown here. */
export function InvitationClosed({
  status,
  workspaceName,
  signedIn,
}: InvitationClosedProps) {
  const copy = COPY[status];
  const opensWorkspace = status === "accepted" && signedIn;

  return (
    <InvitationStatusCard
      icon={copy.icon}
      tone={copy.tone}
      title={copy.title}
      description={copy.description(workspaceName)}
      announce={copy.announce}
    >
      <Link
        href={signedIn ? "/" : "/login"}
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-10 w-full px-4 hover:bg-primary-hover sm:h-9",
        )}
      >
        {opensWorkspace ? "Open workspace" : signedIn ? "Go to Syntra" : "Go to sign in"}
      </Link>
    </InvitationStatusCard>
  );
}
