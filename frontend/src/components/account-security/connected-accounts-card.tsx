"use client";

import { useId, useState } from "react";
import { FcGoogle } from "react-icons/fc";

import { LinkGoogleButton } from "@/components/account-security/link-google-button";
import { SecurityCard } from "@/components/account-security/security-card";
import { SecurityRow } from "@/components/account-security/security-row";
import { UnlinkGoogleDialog } from "@/components/account-security/unlink-google-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const GOOGLE_PROVIDER = "google";
const UNLINK_BLOCKED_REASON =
  "Add a password first. Google is your only way to sign in.";

type ConnectedAccountsCardProps = {
  providers: readonly string[];
  hasPassword: boolean;
};

export function ConnectedAccountsCard({
  providers,
  hasPassword,
}: ConnectedAccountsCardProps) {
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const reasonId = useId();
  const connected = providers.includes(GOOGLE_PROVIDER);

  const unlinkButton = (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      // aria-disabled rather than disabled: a disabled button cannot be focused or hovered, so its tooltip would never show.
      aria-disabled={hasPassword ? undefined : true}
      aria-describedby={hasPassword ? undefined : reasonId}
      onClick={() => {
        if (hasPassword) {
          setUnlinkOpen(true);
        }
      }}
      className="-ml-4 h-10 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent sm:ml-0 sm:h-9 dark:hover:bg-destructive/20"
    >
      Unlink
    </Button>
  );

  return (
    <SecurityCard title="Connected accounts">
      <SecurityRow
        icon={<FcGoogle />}
        title="Google"
        description={connected ? "Connected" : "Not connected"}
        action={
          connected ? (
            hasPassword ? (
              unlinkButton
            ) : (
              <>
                <span id={reasonId} className="sr-only">
                  {UNLINK_BLOCKED_REASON}
                </span>
                <Tooltip>
                  <TooltipTrigger render={unlinkButton} />
                  <TooltipContent className="text-balance">{UNLINK_BLOCKED_REASON}</TooltipContent>
                </Tooltip>
              </>
            )
          ) : (
            <LinkGoogleButton />
          )
        }
      />
      <UnlinkGoogleDialog open={unlinkOpen} onOpenChange={setUnlinkOpen} />
    </SecurityCard>
  );
}
