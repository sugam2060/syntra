import Link from "next/link";
import { LuLoaderCircle } from "react-icons/lu";

import { InvitationOverview } from "@/components/invitation-accept/invitation-overview";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvitationPreview } from "@/types/shared";

type InvitationReadyProps = {
  preview: InvitationPreview;
  /** Address of the signed-in account, so a wrong account is easy to spot before accepting. */
  email: string;
  /** True from the click until the page has navigated away. */
  isAccepting: boolean;
  onAccept: () => void;
};

/** A pending invitation for a signed-in, verified user. "Not now" only leaves: declining needs an invitation id this page never has. */
export function InvitationReady({
  preview,
  email,
  isAccepting,
  onAccept,
}: InvitationReadyProps) {
  return (
    <>
      <InvitationOverview preview={preview} />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            disabled={isAccepting}
            onClick={onAccept}
            className="h-10 w-full gap-2 px-4 hover:bg-primary-hover disabled:bg-primary-hover disabled:opacity-100 sm:h-9"
          >
            {isAccepting ? (
              <>
                <LuLoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Accepting...
              </>
            ) : (
              "Accept invitation"
            )}
          </Button>
          <Link
            href="/"
            aria-disabled={isAccepting}
            tabIndex={isAccepting ? -1 : undefined}
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "h-10 w-full px-4 text-muted-foreground sm:h-9",
              isAccepting && "pointer-events-none opacity-50",
            )}
          >
            Not now
          </Link>
        </div>
        <p className="text-center text-xs leading-[18px] break-all text-muted-foreground">
          Signed in as {email}
        </p>
      </div>
    </>
  );
}
