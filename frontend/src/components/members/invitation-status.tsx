import { StatusPill } from "@/components/members/status-pill";
import { cn } from "@/lib/utils";
import type { WorkspaceInvitation } from "@/types/shared";

type InvitationStatusProps = {
  status: WorkspaceInvitation["status"];
};

/** Pending in the info tint, Expired in amber. */
export function InvitationStatus({ status }: InvitationStatusProps) {
  return status === "expired" ? (
    <StatusPill tone="warning">Expired</StatusPill>
  ) : (
    <StatusPill tone="info">Pending</StatusPill>
  );
}

type InvitationExpiryProps = {
  label: string;
  urgent: boolean;
};

/** Relative expiry, in amber when the invitation expired or has under 48 hours left. */
export function InvitationExpiry({ label, urgent }: InvitationExpiryProps) {
  return <span className={cn("text-sm", urgent ? "text-warning" : "text-muted-foreground")}>{label}</span>;
}
