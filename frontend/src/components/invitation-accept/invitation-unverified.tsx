"use client";

import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useResendVerification } from "@/api/auth";
import { InvitationOverview } from "@/components/invitation-accept/invitation-overview";
import { InvitationSwitchAccountButton } from "@/components/invitation-accept/invitation-switch-account-button";
import { AuthBanner } from "@/components/shared/auth-banner";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";
import { AUTH_BANNER_VARIANT, type InvitationPreview } from "@/types/shared";

type InvitationUnverifiedProps = {
  preview: InvitationPreview;
  returnPath: string;
};

/** The signed-in account has not verified its email, which the gateway requires before accepting. */
export function InvitationUnverified({
  preview,
  returnPath,
}: InvitationUnverifiedProps) {
  const resend = useResendVerification();

  function handleResend(): void {
    resend.mutate(
      { email: preview.invitedEmail.trim().toLowerCase() },
      {
        onSuccess: () =>
          toast.success("Verification email sent", {
            description:
              "If an unverified account exists for that address, we sent a new link.",
          }),
        onError: (error: unknown) =>
          toast.error(
            error instanceof ApiError && error.status === 429
              ? "Too many attempts. Try again in a minute."
              : "Couldn't send the email. Try again.",
          ),
      },
    );
  }

  return (
    <>
      <InvitationOverview preview={preview} />
      <div className="flex flex-col gap-4">
        <AuthBanner variant={AUTH_BANNER_VARIANT.warning}>
          Verify your email to accept this invitation. We&apos;ll send a new link to{" "}
          <span className="font-medium break-all">{preview.invitedEmail}</span>.
        </AuthBanner>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            disabled={resend.isPending}
            onClick={handleResend}
            className="h-10 w-full gap-2 px-4 hover:bg-primary-hover disabled:bg-primary-hover disabled:opacity-100 sm:h-9"
          >
            {resend.isPending ? (
              <>
                <LuLoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Sending...
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>
          <InvitationSwitchAccountButton returnPath={returnPath} variant="outline">
            Sign out
          </InvitationSwitchAccountButton>
        </div>
      </div>
    </>
  );
}
