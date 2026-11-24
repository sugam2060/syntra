import Link from "next/link";

import { InvitationOverview } from "@/components/invitation-accept/invitation-overview";
import { buttonVariants } from "@/components/ui/button";
import { loginPathWithNext } from "@/lib/invitation-paths";
import { cn } from "@/lib/utils";
import type { InvitationPreview } from "@/types/shared";

type InvitationSignedOutProps = {
  preview: InvitationPreview;
  /** The accept page URL (path and query) to come back to after signing in. */
  returnPath: string;
};

/**
 * A pending invitation and no session. Creating an account does not carry the way back: after
 * registering and verifying their email the person signs in and opens the emailed link again.
 */
export function InvitationSignedOut({ preview, returnPath }: InvitationSignedOutProps) {
  return (
    <>
      <InvitationOverview preview={preview} />
      <div className="flex flex-col gap-3">
        <p className="text-center text-sm leading-[21px] break-words text-muted-foreground">
          Sign in as{" "}
          <span className="font-medium break-all text-foreground">
            {preview.invitedEmail}
          </span>{" "}
          to accept.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href={loginPathWithNext(returnPath)}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-10 w-full px-4 hover:bg-primary-hover sm:h-9",
            )}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-10 w-full px-4 sm:h-9",
            )}
          >
            Create account
          </Link>
        </div>
      </div>
    </>
  );
}
