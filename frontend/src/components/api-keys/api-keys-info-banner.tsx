import { LuKeyRound } from "react-icons/lu";

/** Reminder shown above the keys: they are secrets, and the plaintext is shown once. */
export function ApiKeysInfoBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-card border border-info/30 bg-info/10 p-3 text-foreground"
    >
      <LuKeyRound className="mt-px size-[18px] shrink-0 text-info" aria-hidden="true" />
      <p className="text-xs leading-[18px]">
        Treat keys like passwords. A key is shown only once, when you create it.
      </p>
    </div>
  );
}
