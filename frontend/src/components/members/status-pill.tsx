import { cn } from "@/lib/utils";

type StatusPillTone = "success" | "info" | "warning" | "neutral";

const TONE_STYLES: Record<StatusPillTone, string> = {
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  neutral: "bg-muted text-muted-foreground ring-1 ring-border",
};

type StatusPillProps = {
  tone: StatusPillTone;
  children: React.ReactNode;
};

/** Small tinted pill. The label always carries the meaning; the tint only supports it. */
export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs leading-4 font-medium whitespace-nowrap",
        TONE_STYLES[tone],
      )}
    >
      {children}
    </span>
  );
}
