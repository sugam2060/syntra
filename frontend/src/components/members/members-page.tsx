"use client";

import { useState } from "react";
import { LuUserPlus } from "react-icons/lu";

import { useWorkspaceInvitations, useWorkspaceMembers } from "@/api/workspaces";
import { InvitationsTab } from "@/components/members/invitations-tab";
import { InviteDialog } from "@/components/members/invite-dialog";
import { MembersTab } from "@/components/members/members-tab";
import { RolesTab } from "@/components/members/roles-tab";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkspace } from "@/providers/workspace-provider";
import { MEMBERS_TAB } from "@/types/members";
import type { MembersTab as MembersTabKey } from "@/types/members";

function parseTab(value: unknown): MembersTabKey {
  return value === MEMBERS_TAB.invitations || value === MEMBERS_TAB.roles
    ? value
    : MEMBERS_TAB.members;
}

type TabCountProps = {
  count: number | undefined;
};

function TabCount({ count }: TabCountProps) {
  if (count === undefined) {
    return null;
  }
  return (
    <span className="rounded-full bg-muted px-1.5 text-xs leading-[18px] text-muted-foreground tabular-nums">
      {count}
    </span>
  );
}

/** Members page: who is in the workspace, who is invited, and what each role can do. */
export function MembersPage() {
  const { workspace, access } = useWorkspace();
  const members = useWorkspaceMembers(workspace.id);
  const invitations = useWorkspaceInvitations(workspace.id, { enabled: access.canManageMembers });
  const [tab, setTab] = useState<MembersTabKey>(MEMBERS_TAB.members);
  const [inviteOpen, setInviteOpen] = useState(false);

  const openInvitations = access.canManageMembers ? invitations.data?.length : undefined;
  const activeTab =
    tab === MEMBERS_TAB.invitations && !access.canManageMembers ? MEMBERS_TAB.members : tab;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Members"
        description={
          access.canManageMembers
            ? `Invite people to ${workspace.name} and choose what each of them can do.`
            : `People in ${workspace.name} and the roles they hold.`
        }
        actions={
          access.canManageMembers ? (
            <Button size="lg" onClick={() => setInviteOpen(true)}>
              <LuUserPlus aria-hidden="true" />
              Invite people
            </Button>
          ) : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={(next) => setTab(parseTab(next))} className="gap-6">
        <TabsList variant="line" className="h-10 w-full justify-start border-b border-border">
          <TabsTrigger value={MEMBERS_TAB.members} className="flex-none px-3">
            Members
            <TabCount count={members.data?.length} />
          </TabsTrigger>
          {access.canManageMembers && (
            <TabsTrigger value={MEMBERS_TAB.invitations} className="flex-none px-3">
              Invitations
              <TabCount count={openInvitations} />
            </TabsTrigger>
          )}
          <TabsTrigger value={MEMBERS_TAB.roles} className="flex-none px-3">
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value={MEMBERS_TAB.members}>
          <MembersTab />
        </TabsContent>
        {access.canManageMembers && (
          <TabsContent value={MEMBERS_TAB.invitations}>
            <InvitationsTab onInvite={() => setInviteOpen(true)} />
          </TabsContent>
        )}
        <TabsContent value={MEMBERS_TAB.roles}>
          <RolesTab />
        </TabsContent>
      </Tabs>

      {access.canManageMembers && (
        <InviteDialog workspaceId={workspace.id} open={inviteOpen} onOpenChange={setInviteOpen} />
      )}
    </div>
  );
}
