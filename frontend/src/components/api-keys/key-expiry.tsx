import { cn } from "@/lib/utils";
import { EXPIRY_TONE } from "@/types/api-keys";
import type { ExpiryDescription, ExpiryTone } from "@/types/api-keys";

const TONE_CLASS: Record<ExpiryTone, string> = {
  [EXPIRY_TONE.muted]: "text-muted-foreground",
  [EXPIRY_TONE.default]: "text-foreground",
  [EXPIRY_TONE.warning]:
    "font-medium text-[color-mix(in_oklch,var(--warning),var(--foreground)_40%)]",
  [EXPIRY_TONE.danger]: "text-destructive",
};

/** "Never" (muted), a date, "Expires in 6 days" (amber) or "Expired". The exact date is the tooltip text. */
export function KeyExpiry({ expiry }: { expiry: ExpiryDescription }) {
  return (
    <span title={expiry.title ?? undefined} className={cn("text-sm", TONE_CLASS[expiry.tone])}>
      {expiry.label}
    </span>
  );
}
