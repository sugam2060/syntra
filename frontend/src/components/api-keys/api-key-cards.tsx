import { ApiKeyCard } from "@/components/api-keys/api-key-card";
import type { ApiKeyRow } from "@/types/api-keys";

type ApiKeyCardsProps = {
  rows: readonly ApiKeyRow[];
  onRevoke: (row: ApiKeyRow) => void;
};

/** The narrow layout of the keys: a divided list of cards. Shown below `xl`. */
export function ApiKeyCards({ rows, onRevoke }: ApiKeyCardsProps) {
  return (
    <ul className="divide-y divide-border xl:hidden">
      {rows.map((row) => (
        <ApiKeyCard key={row.key.id} row={row} onRevoke={onRevoke} />
      ))}
    </ul>
  );
}
