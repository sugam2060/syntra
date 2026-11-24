import { MemberActionsMenu } from "@/components/members/member-actions-menu";
import { MemberIdentity } from "@/components/members/member-identity";
import { MemberRoleControl } from "@/components/members/member-role-control";
import { formatDate } from "@/lib/relative-time";
import type { MemberListControls } from "@/types/members";
import type { WorkspaceMember } from "@/types/shared";

type MemberCardsProps = {
  members: readonly WorkspaceMember[];
  controls: MemberListControls;
};

/** Mobile list of members: stacked cards, so nothing scrolls sideways. From `md` the table takes over. */
export function MemberCards({ members, controls }: MemberCardsProps) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {members.map((member) => {
        const isSelf = member.userId === controls.currentUserId;
        return (
          <li
            key={member.userId}
            className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <MemberIdentity member={member} isSelf={isSelf} />
              <MemberActionsMenu member={member} controls={controls} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <MemberRoleControl
                member={member}
                roles={controls.roles}
                canGrant={controls.canGrant}
                isSelf={isSelf}
                canManage={controls.canManage}
                pending={controls.pendingUserId === member.userId}
                onChange={(roleId) => controls.onChangeRole(member, roleId)}
              />
              <span className="text-xs text-muted-foreground">
                Joined {formatDate(member.joinedAt)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
