type DangerZoneRowProps = {
  title: string;
  description: string;
  /** The destructive button (or the dialog trigger that renders it). */
  action: React.ReactNode;
};

/** One destructive action: what it does on the left, the button on the right (below the text on small screens). */
export function DangerZoneRow({ title, description, action }: DangerZoneRowProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="text-sm leading-5 font-medium text-foreground">{title}</h3>
        <p className="text-sm leading-[21px] text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
