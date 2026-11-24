import { StepProgress } from "@/components/onboarding/step-progress";
import { TopBar } from "@/components/shared/top-bar";
import { UserMenu } from "@/components/shared/user-menu";
import type { OnboardingStep } from "@/types/onboarding";

type OnboardingShellProps = {
  step: OnboardingStep;
  children: React.ReactNode;
};

/** Frame of every onboarding step: slim top bar with the progress and the signed-in user, content centered below. */
export function OnboardingShell({ step, children }: OnboardingShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar center={<StepProgress step={step} />} end={<UserMenu />} />
      <main className="flex flex-1 items-center justify-center p-6 lg:p-12">
        {children}
      </main>
    </div>
  );
}
