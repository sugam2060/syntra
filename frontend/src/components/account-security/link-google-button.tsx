"use client";

import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useStartGoogleLink } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-error";

const LINK_FAILED_TOAST_ID = "google-link-start-failed";

function startErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return "Too many attempts. Try again in a minute.";
    }
    if (error.status === 0) {
      return error.message;
    }
  }
  return "Couldn't start linking Google. Try again.";
}

/** Asks the gateway for the Google consent URL, then sends the browser there. */
export function LinkGoogleButton() {
  const startLink = useStartGoogleLink();
  // Stays busy after success too: the page is about to be replaced by Google's.
  const isBusy = startLink.isPending || startLink.isSuccess;

  function handleClick(): void {
    startLink.mutate(undefined, {
      onSuccess: (url) => window.location.assign(url),
      onError: (error) =>
        toast.error(startErrorMessage(error), { id: LINK_FAILED_TOAST_ID }),
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      disabled={isBusy}
      onClick={handleClick}
      className="h-10 gap-2 px-4 sm:h-9"
    >
      {isBusy ? (
        <>
          <LuLoaderCircle className="animate-spin" aria-hidden="true" />
          Opening Google...
        </>
      ) : (
        "Link Google account"
      )}
    </Button>
  );
}
