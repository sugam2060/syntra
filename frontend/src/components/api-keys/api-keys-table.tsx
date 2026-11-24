import { ApiKeyTableRow } from "@/components/api-keys/api-key-table-row";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ApiKeyRow } from "@/types/api-keys";

const COLUMNS = [
  "Name",
  "Key",
  "Permissions",
  "Created by",
  "Expires",
  "Last used",
  "Status",
] as const;

type ApiKeysTableProps = {
  rows: readonly ApiKeyRow[];
  onRevoke: (row: ApiKeyRow) => void;
};

/** The wide layout of the keys. Below `xl` the page shows `ApiKeyCard`s instead. */
export function ApiKeysTable({ rows, onRevoke }: ApiKeysTableProps) {
  return (
    <Table className="hidden xl:table">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {COLUMNS.map((column) => (
            <TableHead key={column} className="px-2 text-xs text-muted-foreground">
              {column}
            </TableHead>
          ))}
          <TableHead className="w-10 px-2">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <ApiKeyTableRow key={row.key.id} row={row} onRevoke={onRevoke} />
        ))}
      </TableBody>
    </Table>
  );
}
