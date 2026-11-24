import { SyntraLogo } from "@/components/shared/syntra-logo";
import { cn } from "@/lib/utils";

type TopBarProps = {
  /** Sits between the logo and the end slot, for example the onboarding progress. */
  center?: React.ReactNode;
  /** Right side, for example the signed-in user. */
  end?: React.ReactNode;
  className?: string;
};

/** The slim 56px bar used on onboarding and callback screens: logo left, optional center, optional end slot. */
export function TopBar({ center, end, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "relative z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6",
        className,
      )}
    >
      <SyntraLogo />
      {center}
      <div className="flex items-center gap-3">{end}</div>
    </header>
  );
}
