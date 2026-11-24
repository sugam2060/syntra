import { KeyActionsMenu } from "@/components/api-keys/key-actions-menu";
import { KeyCreatorCell } from "@/components/api-keys/key-creator-cell";
import { KeyExpiry } from "@/components/api-keys/key-expiry";
import { KeyPrefix } from "@/components/api-keys/key-prefix";
import { KeyStatusBadge } from "@/components/api-keys/key-status-badge";
import { PermissionChips } from "@/components/api-keys/permission-chips";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { API_KEY_STATUS } from "@/types/api-keys";
import type { ApiKeyRow } from "@/types/api-keys";

type ApiKeyTableRowProps = {
  row: ApiKeyRow;
  onRevoke: (row: ApiKeyRow) => void;
};

/**
 * One key as a table row. Revoked keys are dimmed (their actions menu is gone anyway). The created
 * date sits under the name to keep the table within the settings column.
 */
export function ApiKeyTableRow({ row, onRevoke }: ApiKeyTableRowProps) {
  const { key } = row;
  const dim = row.status === API_KEY_STATUS.revoked && "opacity-60";
  return (
    <TableRow data-status={row.status}>
      <TableCell className={cn("max-w-[150px] px-2 py-3", dim)}>
        <span className="block truncate text-sm font-medium" title={key.name}>
          {key.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          Created {row.createdLabel}
        </span>
      </TableCell>
      <TableCell className={cn("px-2", dim)}>
        <KeyPrefix keyPrefix={key.keyPrefix} keyName={key.name} />
      </TableCell>
      <TableCell className={cn("w-[150px] min-w-[150px] px-2 whitespace-normal", dim)}>
        <PermissionChips permissions={key.permissions} />
      </TableCell>
      <TableCell className={cn("max-w-[120px] px-2", dim)}>
        <KeyCreatorCell creator={row.creator} />
      </TableCell>
      <TableCell className={cn("px-2", dim)}>
        <KeyExpiry expiry={row.expiry} />
      </TableCell>
      <TableCell
        className={cn(
          "px-2 text-sm",
          row.neverUsed ? "text-muted-foreground" : "text-foreground",
          dim,
        )}
      >
        {row.lastUsedLabel}
      </TableCell>
      <TableCell className="px-2">
        <KeyStatusBadge status={row.status} />
      </TableCell>
      <TableCell className="w-9 px-1 text-right">
        <KeyActionsMenu row={row} onRevoke={onRevoke} />
      </TableCell>
    </TableRow>
  );
}
