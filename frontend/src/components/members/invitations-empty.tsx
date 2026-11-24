import { LuMailPlus } from "react-icons/lu";

import { Button } from "@/components/ui/button";

type InvitationsEmptyProps = {
  onInvite: () => void;
};

/** Shown when nobody has an open invitation. */
export function InvitationsEmpty({ onInvite }: InvitationsEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-6 py-12 text-center">
      <LuMailPlus className="size-6 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm leading-5 font-medium text-foreground">No open invitations</p>
        <p className="text-xs leading-[18px] text-muted-foreground">
          People you invite show up here until they accept or the link expires.
        </p>
      </div>
      <Button onClick={onInvite}>Invite people</Button>
    </div>
  );
}
