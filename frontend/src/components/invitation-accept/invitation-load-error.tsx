import { LuCircleAlert, LuClock } from "react-icons/lu";

import { InvitationStatusCard } from "@/components/invitation-accept/invitation-status-card";
import { Button } from "@/components/ui/button";
import {
  INVITATION_LOAD_PROBLEM,
  type InvitationLoadProblem,
} from "@/types/invitation-accept";
import { AUTH_STATUS_TONE } from "@/types/shared";

type InvitationLoadErrorProps = {
  problem: InvitationLoadProblem;
  onRetry: () => void;
};

/** The invitation could not be loaded: rate limited or the server was unreachable. Says nothing about the invitation itself. */
export function InvitationLoadError({ problem, onRetry }: InvitationLoadErrorProps) {
  const rateLimited = problem === INVITATION_LOAD_PROBLEM.rateLimited;

  return (
    <InvitationStatusCard
      icon={rateLimited ? LuClock : LuCircleAlert}
      tone={rateLimited ? AUTH_STATUS_TONE.warning : AUTH_STATUS_TONE.danger}
      title={rateLimited ? "Too many attempts" : "Couldn't load the invitation"}
      description={
        rateLimited
          ? "Wait a minute, then try again."
          : "We couldn't reach the server. Check your connection and try again."
      }
      announce="alert"
    >
      <Button
        type="button"
        size="lg"
        onClick={onRetry}
        className="h-10 w-full px-4 hover:bg-primary-hover sm:h-9"
      >
        Try again
      </Button>
    </InvitationStatusCard>
  );
}
