import type { Metadata } from "next";

import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

export const metadata: Metadata = {
  title: "Name your workspace — Syntra",
  robots: { index: false, follow: false },
};

export default function CreateWorkspacePage() {
  return (
    <OnboardingShell step={2}>
      <CreateWorkspaceForm />
    </OnboardingShell>
  );
}
