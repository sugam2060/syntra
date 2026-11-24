import { cn } from "@/lib/utils";

type SettingsSectionCardProps = {
  /** Id of the heading, so the card can be labelled by it. */
  titleId: string;
  title: string;
  description?: string;
  /** `danger` tints the border for destructive actions. */
  tone?: "default" | "danger";
  children: React.ReactNode;
};

/** A titled settings card. The body brings its own padding so a form footer can run edge to edge. */
export function SettingsSectionCard({
  titleId,
  title,
  description,
  tone = "default",
  children,
}: SettingsSectionCardProps) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "overflow-hidden rounded-[10px] border bg-surface",
        tone === "danger" ? "border-destructive/40" : "border-border",
      )}
    >
      <header className="flex flex-col gap-0.5 px-4 pt-4">
        <h2
          id={titleId}
          className="text-[15px] leading-[22px] font-semibold text-foreground"
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm leading-[21px] text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}
