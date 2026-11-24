import { LuLock } from "react-icons/lu";

/** Replaces the keys when the caller lacks `ai:manage_keys`. */
export function ApiKeysNoAccess() {
  return (
    <section
      aria-labelledby="api-keys-no-access-heading"
      className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-12 text-center"
    >
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <LuLock className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h2
          id="api-keys-no-access-heading"
          className="text-[15px] leading-[22px] font-semibold text-foreground"
        >
          You need the <span className="font-mono text-sm">ai:manage_keys</span> permission
        </h2>
        <p className="max-w-[44ch] text-sm leading-[21px] text-muted-foreground">
          Ask a workspace owner or admin to create keys for you, or to give you this permission.
        </p>
      </div>
    </section>
  );
}
