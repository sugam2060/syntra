import { MemberActionsMenu } from "@/components/members/member-actions-menu";
import { MemberIdentity } from "@/components/members/member-identity";
import { MemberRoleControl } from "@/components/members/member-role-control";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/relative-time";
import type { MemberListControls } from "@/types/members";
import type { WorkspaceMember } from "@/types/shared";

type MembersTableProps = {
  members: readonly WorkspaceMember[];
  controls: MemberListControls;
};

/** Desktop list of members: one 48px row each. Below `md` the cards take over. */
export function MembersTable({ members, controls }: MembersTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-card border border-border md:block">
      <Table>
        <TableHeader className="bg-surface">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 px-4 text-xs text-muted-foreground">Member</TableHead>
            <TableHead className="h-10 px-4 text-xs text-muted-foreground">Role</TableHead>
            <TableHead className="h-10 px-4 text-xs text-muted-foreground">Joined</TableHead>
            {controls.canManage && (
              <TableHead className="h-10 w-14 px-4">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isSelf = member.userId === controls.currentUserId;
            return (
              <TableRow key={member.userId} className="h-12">
                <TableCell className="max-w-[320px] px-4 py-1">
                  <MemberIdentity member={member} isSelf={isSelf} />
                </TableCell>
                <TableCell className="px-4 py-1">
                  <MemberRoleControl
                    member={member}
                    roles={controls.roles}
                    canGrant={controls.canGrant}
                    isSelf={isSelf}
                    canManage={controls.canManage}
                    pending={controls.pendingUserId === member.userId}
                    onChange={(roleId) => controls.onChangeRole(member, roleId)}
                  />
                </TableCell>
                <TableCell className="px-4 py-1 text-sm text-muted-foreground">
                  {formatDate(member.joinedAt)}
                </TableCell>
                {controls.canManage && (
                  <TableCell className="px-4 py-1 text-right">
                    <MemberActionsMenu member={member} controls={controls} />
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
