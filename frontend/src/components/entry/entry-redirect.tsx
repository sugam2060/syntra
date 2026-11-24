"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMyWorkspaces } from "@/api/workspaces";
import { EntryError } from "@/components/entry/entry-error";
import { EntryLoading } from "@/components/entry/entry-loading";
import { ONBOARDING_PATH, workspaceHomePath } from "@/lib/onboarding-paths";

/**
 * The app's front door (`/`): sends a signed-in user to their workspace, or to onboarding when they
 * do not belong to one yet. Everyone lands here after signing in, so this is the one place that decides.
 * A visitor without a session is sent to `/login` by the API client when the request answers 401.
 */
export function EntryRedirect() {
  const router = useRouter();
  const workspaces = useMyWorkspaces();

  useEffect(() => {
    if (!workspaces.isSuccess) {
      return;
    }
    const [first] = workspaces.data;
    router.replace(first ? workspaceHomePath(first.slug) : ONBOARDING_PATH.start);
  }, [workspaces.isSuccess, workspaces.data, router]);

  if (workspaces.isError) {
    return <EntryError onRetry={() => void workspaces.refetch()} />;
  }
  return <EntryLoading />;
}
