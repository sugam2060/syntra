import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { API_KEY_STATUS } from "@/types/api-keys";
import type { ApiKeyStatus } from "@/types/api-keys";

const STATUS_STYLES: Record<ApiKeyStatus, { label: string; className: string }> = {
  [API_KEY_STATUS.active]: {
    label: "Active",
    className: "bg-success/10 text-[color-mix(in_oklch,var(--success),var(--foreground)_35%)]",
  },
  [API_KEY_STATUS.expired]: {
    label: "Expired",
    className: "bg-warning/10 text-[color-mix(in_oklch,var(--warning),var(--foreground)_40%)]",
  },
  [API_KEY_STATUS.revoked]: {
    label: "Revoked",
    className: "bg-muted text-muted-foreground",
  },
};

/** The status as a word in a tinted pill, never colour alone. */
export function KeyStatusBadge({ status }: { status: ApiKeyStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <Badge variant="secondary" className={cn("border-border/60", className)}>
      {label}
    </Badge>
  );
}
