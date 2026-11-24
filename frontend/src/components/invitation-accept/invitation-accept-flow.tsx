"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useCurrentUser, useSessionProbe } from "@/api/auth";
import {
  useAcceptInvitationByToken,
  useInvitationPreview,
} from "@/api/workspaces";
import { InvitationAcceptSkeleton } from "@/components/invitation-accept/invitation-accept-skeleton";
import { InvitationClosed } from "@/components/invitation-accept/invitation-closed";
import { InvitationIncomplete } from "@/components/invitation-accept/invitation-incomplete";
import { InvitationInvalid } from "@/components/invitation-accept/invitation-invalid";
import { InvitationLoadError } from "@/components/invitation-accept/invitation-load-error";
import { InvitationReady } from "@/components/invitation-accept/invitation-ready";
import { InvitationSignedOut } from "@/components/invitation-accept/invitation-signed-out";
import { InvitationUnverified } from "@/components/invitation-accept/invitation-unverified";
import { ApiError } from "@/lib/api-error";
import {
  INVITATION_ACCEPT_PATH,
  invitationAcceptPath,
} from "@/lib/invitation-paths";
import { workspaceHomePath } from "@/lib/onboarding-paths";
import { DEFAULT_REDIRECT_PATH } from "@/lib/safe-redirect";
import { INVITATION_LOAD_PROBLEM } from "@/types/invitation-accept";
import { invitationTokenSchema } from "@/types/schema";

const EMAIL_NOT_VERIFIED_CODE = "EMAIL_NOT_VERIFIED";

type InvitationAcceptFlowProps = {
  /** The `token` search parameter of the emailed link, or null when it is absent. */
  token: string | null;
};

function acceptErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403 && error.code === EMAIL_NOT_VERIFIED_CODE) {
      return "Verify your email to accept this invitation.";
    }
    if (error.status === 400) {
      return "This invitation isn't valid for this account.";
    }
    if (error.status === 429) {
      return "Too many attempts. Try again in a minute.";
    }
  }
  return "Couldn't accept the invitation. Try again.";
}

/**
 * The accept page for an emailed token. It works signed out: the preview is public and the session is
 * detected with a probe that never redirects to `/login`. Which card shows is decided here, top to bottom:
 * link without a token, loading, load failures, closed invitation, signed out, refused by the gateway
 * (wrong account), unverified email, and finally the invitation ready to accept.
 */
export function InvitationAcceptFlow({ token }: InvitationAcceptFlowProps) {
  const router = useRouter();

  // A missing or malformed token can never work, so skip every request.
  const parsed = invitationTokenSchema.safeParse(token);
  const validToken = parsed.success ? parsed.data : null;
  const returnPath =
    validToken === null ? INVITATION_ACCEPT_PATH : invitationAcceptPath(validToken);

  const preview = useInvitationPreview(validToken);
  const session = useSessionProbe({ enabled: validToken !== null });
  const signedIn = session.data === true;
  const user = useCurrentUser({ enabled: signedIn });
  const accept = useAcceptInvitationByToken();

  const acceptError = accept.error instanceof ApiError ? accept.error : null;

  function handleAccept(): void {
    if (validToken === null) {
      return;
    }
    accept.mutate(validToken, {
      onSuccess: (joined) => {
        toast.success(`You joined ${preview.data?.workspaceName ?? "the workspace"}`);
        router.replace(
          joined.slug === null ? DEFAULT_REDIRECT_PATH : workspaceHomePath(joined.slug),
        );
      },
      onError: (error: unknown) => toast.error(acceptErrorMessage(error)),
    });
  }

  if (validToken === null) {
    return <InvitationIncomplete />;
  }
  if (preview.isPending || session.isPending) {
    return <InvitationAcceptSkeleton />;
  }
  if (session.isError) {
    return (
      <InvitationLoadError
        problem={INVITATION_LOAD_PROBLEM.unreachable}
        onRetry={() => void session.refetch()}
      />
    );
  }
  if (preview.isError) {
    const { error } = preview;
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return <InvitationInvalid signedIn={signedIn} returnPath={returnPath} />;
    }
    return (
      <InvitationLoadError
        problem={
          error instanceof ApiError && error.status === 429
            ? INVITATION_LOAD_PROBLEM.rateLimited
            : INVITATION_LOAD_PROBLEM.unreachable
        }
        onRetry={() => void preview.refetch()}
      />
    );
  }

  const invitation = preview.data;
  if (invitation.status !== "pending") {
    return (
      <InvitationClosed
        status={invitation.status}
        workspaceName={invitation.workspaceName}
        signedIn={signedIn}
      />
    );
  }
  if (!signedIn) {
    return <InvitationSignedOut preview={invitation} returnPath={returnPath} />;
  }
  if (acceptError?.status === 400) {
    return <InvitationInvalid signedIn returnPath={returnPath} />;
  }
  if (user.isError) {
    return (
      <InvitationLoadError
        problem={INVITATION_LOAD_PROBLEM.unreachable}
        onRetry={() => void user.refetch()}
      />
    );
  }
  if (user.isPending) {
    return <InvitationAcceptSkeleton />;
  }

  const refusedAsUnverified =
    acceptError?.status === 403 && acceptError.code === EMAIL_NOT_VERIFIED_CODE;
  if (!user.data.emailVerified || refusedAsUnverified) {
    return <InvitationUnverified preview={invitation} returnPath={returnPath} />;
  }
  return (
    <InvitationReady
      preview={invitation}
      email={user.data.email}
      isAccepting={accept.isPending || accept.isSuccess}
      onAccept={handleAccept}
    />
  );
}
