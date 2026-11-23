import { FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** Label that stays neutral even when its field is invalid (the design only recolors the border). */
export function AuthFieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof FieldLabel>) {
  return (
    <FieldLabel
      className={cn("text-xs leading-4 text-foreground", className)}
      {...props}
    />
  );
}
