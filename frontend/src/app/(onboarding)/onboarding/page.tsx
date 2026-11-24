import type { Metadata } from "next";

import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { OnboardingStart } from "@/components/onboarding/onboarding-start";

export const metadata: Metadata = {
  title: "Welcome to Syntra",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <OnboardingShell step={1}>
      <OnboardingStart />
    </OnboardingShell>
  );
}
