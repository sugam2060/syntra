import Link from "next/link";
import { LuCircleAlert } from "react-icons/lu";

import { InvitationStatusCard } from "@/components/invitation-accept/invitation-status-card";
import { InvitationSwitchAccountButton } from "@/components/invitation-accept/invitation-switch-account-button";
import { buttonVariants } from "@/components/ui/button";
import { loginPathWithNext } from "@/lib/invitation-paths";
import { cn } from "@/lib/utils";
import { AUTH_STATUS_TONE } from "@/types/shared";

type InvitationInvalidProps = {
  signedIn: boolean;
  returnPath: string;
};

/**
 * One generic answer for an unknown token and for a token meant for another address: the gateway
 * answers both the same way so the page cannot be used to probe invitations, and so neither does this one.
 */
export function InvitationInvalid({ signedIn, returnPath }: InvitationInvalidProps) {
  return (
    <InvitationStatusCard
      icon={LuCircleAlert}
      tone={AUTH_STATUS_TONE.danger}
      title="We can't open this invitation"
      description="This invitation isn't valid for this account. The link may be invalid, expired, or sent to a different email address. Sign in with the address that was invited."
      announce="alert"
    >
      {signedIn ? (
        <InvitationSwitchAccountButton returnPath={returnPath}>
          Sign in with a different account
        </InvitationSwitchAccountButton>
      ) : (
        <Link
          href={loginPathWithNext(returnPath)}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 w-full px-4 hover:bg-primary-hover sm:h-9",
          )}
        >
          Sign in
        </Link>
      )}
    </InvitationStatusCard>
  );
}
