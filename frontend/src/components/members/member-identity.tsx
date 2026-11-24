import { PersonAvatar } from "@/components/members/person-avatar";
import { StatusPill } from "@/components/members/status-pill";
import type { WorkspaceMember } from "@/types/shared";

type MemberIdentityProps = {
  member: WorkspaceMember;
  isSelf: boolean;
};

/** Avatar, name and email of a member, with a "You" tag on the signed-in user's own row. */
export function MemberIdentity({ member, isSelf }: MemberIdentityProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PersonAvatar name={member.name} email={member.email} avatarUrl={member.avatarUrl} />
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm leading-5 font-medium text-foreground">
            {member.name ?? member.email}
          </span>
          {isSelf && <StatusPill tone="neutral">You</StatusPill>}
        </span>
        {member.name && (
          <span className="truncate text-xs leading-[18px] text-muted-foreground">
            {member.email}
          </span>
        )}
      </div>
    </div>
  );
}
