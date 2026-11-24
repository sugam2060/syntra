import { redirect } from "next/navigation";

import { InviteTeamForm } from "@/components/onboarding/invite-team-form";
import { ONBOARDING_PATH } from "@/lib/onboarding-paths";

type InviteTeamContentProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Reads `?workspace=<slug>` on the server. Without it there is nobody to invite into, so go back a step. Render inside Suspense. */
export async function InviteTeamContent({ searchParams }: InviteTeamContentProps) {
  const { workspace } = await searchParams;
  const slug = Array.isArray(workspace) ? workspace[0] : workspace;

  if (!slug) {
    redirect(ONBOARDING_PATH.workspace);
  }
  return <InviteTeamForm workspaceSlug={slug} />;
}
