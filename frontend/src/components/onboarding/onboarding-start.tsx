"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuArrowRight, LuMail, LuSquarePlus } from "react-icons/lu";

import { useCurrentUser } from "@/api/auth";
import { useMyInvitations } from "@/api/workspaces";
import { PendingInvitations } from "@/components/onboarding/pending-invitations";
import { StartOptionCard } from "@/components/onboarding/start-option-card";
import { Button } from "@/components/ui/button";
import { ONBOARDING_PATH } from "@/lib/onboarding-paths";
import { getFirstName } from "@/lib/user-display";
import { START_OPTION, type StartOption } from "@/types/onboarding";

/** Step 1: create a workspace or join one from a pending invitation. */
export function OnboardingStart() {
  const router = useRouter();
  const user = useCurrentUser();
  const invitations = useMyInvitations();
  const [option, setOption] = useState<StartOption>(START_OPTION.create);

  const email = user.data?.email;
  const firstName = getFirstName(user.data?.name ?? null);
  const isJoining = option === START_OPTION.join;
  const hasInvitations = (invitations.data?.length ?? 0) > 0;

  function handleContinue(): void {
    router.push(ONBOARDING_PATH.workspace);
  }

  return (
    <div className="flex w-full max-w-[584px] flex-col gap-8">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          {firstName ? `Welcome to Syntra, ${firstName}` : "Welcome to Syntra"}
        </h1>
        <p className="text-sm leading-[21px] text-muted-foreground">
          Set up a workspace for your team.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="How do you want to start?"
        className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2"
      >
        <StartOptionCard
          value={START_OPTION.create}
          selected={!isJoining}
          onSelect={setOption}
          icon={LuSquarePlus}
          title="Create a workspace"
          description="Start fresh and invite your team."
        />
        <StartOptionCard
          value={START_OPTION.join}
          selected={isJoining}
          onSelect={setOption}
          icon={LuMail}
          title="Join with an invitation"
          description={
            email
              ? `Use the invite sent to ${email}.`
              : "Use the invite sent to your email."
          }
        />
      </div>

      {isJoining && !invitations.isPending && !invitations.isError && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {hasInvitations
            ? "Accept an invitation below to join its workspace."
            : email
              ? `No pending invitations for ${email}. Ask a teammate to invite you.`
              : "No pending invitations. Ask a teammate to invite you."}
        </p>
      )}

      <PendingInvitations
        invitations={invitations.data}
        isPending={invitations.isPending}
        isError={invitations.isError}
        onRetry={() => void invitations.refetch()}
        email={email}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={isJoining}
          onClick={handleContinue}
          className="h-10 w-full gap-2 px-6 hover:bg-primary-hover sm:h-9 sm:w-auto"
        >
          Continue
          <LuArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
