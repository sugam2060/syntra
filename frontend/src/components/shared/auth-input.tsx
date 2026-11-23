import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Auth-page input: 40px on mobile, 36px from `sm`, no glow ring when invalid. */
export function AuthInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-10 bg-background aria-invalid:ring-0 sm:h-9 dark:bg-surface dark:aria-invalid:ring-0",
        className,
      )}
      {...props}
    />
  );
}
