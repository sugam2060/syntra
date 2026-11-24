import Link from "next/link";
import { LuLink } from "react-icons/lu";

import { InvitationStatusCard } from "@/components/invitation-accept/invitation-status-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUTH_STATUS_TONE } from "@/types/shared";

/** The URL has no usable `token`, so no request is made. */
export function InvitationIncomplete() {
  return (
    <InvitationStatusCard
      icon={LuLink}
      tone={AUTH_STATUS_TONE.warning}
      title="This invitation link is incomplete"
      description="The link is missing its invitation token. Open it again from your email, or ask the person who invited you to send a new one."
      announce="alert"
    >
      <Link
        href="/"
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-10 w-full px-4 hover:bg-primary-hover sm:h-9",
        )}
      >
        Go to Syntra
      </Link>
    </InvitationStatusCard>
  );
}
