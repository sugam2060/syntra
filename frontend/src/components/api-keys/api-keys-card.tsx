import { ApiKeyCards } from "@/components/api-keys/api-key-cards";
import { ApiKeysEmpty } from "@/components/api-keys/api-keys-empty";
import { ApiKeysError } from "@/components/api-keys/api-keys-error";
import { ApiKeysSkeleton } from "@/components/api-keys/api-keys-skeleton";
import { ApiKeysTable } from "@/components/api-keys/api-keys-table";
import { KeyUsageMeter } from "@/components/api-keys/key-usage-meter";
import { MAX_ACTIVE_API_KEYS } from "@/lib/api-key-status";
import type { ApiKeyRow } from "@/types/api-keys";

type ApiKeysCardProps =
  | { state: "loading" }
  | { state: "error"; message: string; onRetry: () => void }
  | { state: "empty"; createAction: React.ReactNode }
  | {
      state: "ready";
      rows: readonly ApiKeyRow[];
      activeCount: number;
      onRevoke: (row: ApiKeyRow) => void;
    };

/** The bordered card that holds the keys: a usage bar on top, then the table or cards, or a state. */
export function ApiKeysCard(props: ApiKeysCardProps) {
  return (
    <section
      aria-label="API keys"
      className="overflow-hidden rounded-card border border-border bg-background"
    >
      {props.state === "ready" && (
        <div className="flex items-center border-b border-border px-4 py-3">
          <KeyUsageMeter active={props.activeCount} max={MAX_ACTIVE_API_KEYS} />
        </div>
      )}
      {props.state === "loading" && <ApiKeysSkeleton />}
      {props.state === "error" && <ApiKeysError message={props.message} onRetry={props.onRetry} />}
      {props.state === "empty" && <ApiKeysEmpty action={props.createAction} />}
      {props.state === "ready" && (
        <>
          <ApiKeysTable rows={props.rows} onRevoke={props.onRevoke} />
          <ApiKeyCards rows={props.rows} onRevoke={props.onRevoke} />
        </>
      )}
    </section>
  );
}
