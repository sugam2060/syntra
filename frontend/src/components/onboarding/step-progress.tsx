import { cn } from "@/lib/utils";
import { ONBOARDING_STEP_COUNT, type OnboardingStep } from "@/types/onboarding";

const STEPS = Array.from({ length: ONBOARDING_STEP_COUNT }, (_, index) => index + 1);

/** Three bars plus "2 / 3". Announced to assistive tech as a single "Step 2 of 3". */
export function StepProgress({ step }: { step: OnboardingStep }) {
  return (
    <div
      role="img"
      aria-label={`Step ${step} of ${ONBOARDING_STEP_COUNT}`}
      className="flex items-center gap-3"
    >
      <div className="flex items-center gap-1" aria-hidden="true">
        {STEPS.map((position) => (
          <span
            key={position}
            className={cn(
              "h-1 w-6 rounded-full sm:w-8",
              position <= step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
      <span
        aria-hidden="true"
        className="hidden font-mono text-[13px] leading-5 whitespace-nowrap text-muted-foreground tabular-nums sm:inline"
      >
        {step} / {ONBOARDING_STEP_COUNT}
      </span>
    </div>
  );
}
