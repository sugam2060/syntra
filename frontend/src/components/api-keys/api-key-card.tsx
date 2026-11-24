import { KeyActionsMenu } from "@/components/api-keys/key-actions-menu";
import { KeyCreatorCell } from "@/components/api-keys/key-creator-cell";
import { KeyExpiry } from "@/components/api-keys/key-expiry";
import { KeyPrefix } from "@/components/api-keys/key-prefix";
import { KeyStatusBadge } from "@/components/api-keys/key-status-badge";
import { PermissionChips } from "@/components/api-keys/permission-chips";
import { cn } from "@/lib/utils";
import { API_KEY_STATUS } from "@/types/api-keys";
import type { ApiKeyRow } from "@/types/api-keys";

type ApiKeyCardProps = {
  row: ApiKeyRow;
  onRevoke: (row: ApiKeyRow) => void;
};

/** One key as a stacked card, for screens too narrow for the table. */
export function ApiKeyCard({ row, onRevoke }: ApiKeyCardProps) {
  const { key } = row;
  return (
    <li data-status={row.status} className="flex flex-col gap-3 p-4">
      <div
        className={cn(
          "flex flex-col gap-3",
          row.status === API_KEY_STATUS.revoked && "opacity-60",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-sm font-medium break-words text-foreground">{key.name}</p>
          <div className="flex shrink-0 items-center gap-1">
            <KeyStatusBadge status={row.status} />
            <KeyActionsMenu row={row} onRevoke={onRevoke} />
          </div>
        </div>
        <KeyPrefix keyPrefix={key.keyPrefix} keyName={key.name} />
        <PermissionChips permissions={key.permissions} showAll />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Created by</dt>
            <dd>
              <KeyCreatorCell creator={row.creator} />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Created</dt>
            <dd className="text-foreground">{row.createdLabel}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Expires</dt>
            <dd>
              <KeyExpiry expiry={row.expiry} />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Last used</dt>
            <dd className={row.neverUsed ? "text-muted-foreground" : "text-foreground"}>
              {row.lastUsedLabel}
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
}
