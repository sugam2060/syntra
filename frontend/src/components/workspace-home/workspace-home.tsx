"use client";

import { LuKeyRound, LuSettings, LuUserPlus } from "react-icons/lu";

import { PageHeader } from "@/components/shared/page-header";
import { GetStartedCard } from "@/components/workspace-home/get-started-card";
import { ProjectsEmptyCard } from "@/components/workspace-home/projects-empty-card";
import { workspacePaths } from "@/lib/workspace-paths";
import { useWorkspace } from "@/providers/workspace-provider";

/** Landing page of a workspace: a welcome, the setup steps that exist today, and an honest note about projects. */
export function WorkspaceHome() {
  const { workspace, access } = useWorkspace();
  const { slug } = workspace;
  const hasSetupSteps =
    access.canManageMembers || access.canManageApiKeys || access.canUpdateWorkspace;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Welcome to ${workspace.name}`}
        description={
          hasSetupSteps
            ? "Your workspace is ready. Set it up, then bring your team in."
            : `Your workspace is ready. Your role here is ${workspace.role.name}.`
        }
      />

      {hasSetupSteps && (
        <section aria-labelledby="get-started-heading" className="flex flex-col gap-3">
          <h2
            id="get-started-heading"
            className="text-[15px] leading-[22px] font-semibold text-foreground"
          >
            Get started
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {access.canManageMembers && (
              <li>
                <GetStartedCard
                  href={workspacePaths.members(slug)}
                  icon={LuUserPlus}
                  title="Invite your team"
                  description="Add teammates and choose what each of them can do."
                />
              </li>
            )}
            {access.canManageApiKeys && (
              <li>
                <GetStartedCard
                  href={workspacePaths.apiKeys(slug)}
                  icon={LuKeyRound}
                  title="Create an API key"
                  description="Let your own tools and scripts reach this workspace."
                />
              </li>
            )}
            {access.canUpdateWorkspace && (
              <li>
                <GetStartedCard
                  href={workspacePaths.settings(slug)}
                  icon={LuSettings}
                  title="Review workspace settings"
                  description="Check the name and address your team sees."
                />
              </li>
            )}
          </ul>
        </section>
      )}

      <ProjectsEmptyCard />
    </div>
  );
}
