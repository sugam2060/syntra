"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useReplaceMemberPermissionOverrides } from "@/api/workspaces";
import { OverrideRow } from "@/components/members/override-row";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/error-message";
import { groupPermissions } from "@/lib/permission-groups";
import { OVERRIDE_CHOICE } from "@/types/members";
import type { OverrideChoice } from "@/types/members";
import type { PermissionInfo, PermissionOverride, WorkspaceMember } from "@/types/shared";

type MemberOverridesEditorProps = {
  workspaceId: string;
  member: WorkspaceMember;
  catalogue: readonly PermissionInfo[];
  /** Permission codes the member's role grants. */
  rolePermissions: ReadonlySet<string>;
  /** Overrides saved on the gateway now. */
  saved: readonly PermissionOverride[];
  canGrant: (permissionKey: string) => boolean;
  onClose: () => void;
};

function toChoices(overrides: readonly PermissionOverride[]): Record<string, OverrideChoice> {
  return Object.fromEntries(overrides.map((override) => [override.permissionKey, override.effect]));
}

/** Editable list of a member's permission overrides, grouped by area, with a footer that saves or clears them all at once. */
export function MemberOverridesEditor({
  workspaceId,
  member,
  catalogue,
  rolePermissions,
  saved,
  canGrant,
  onClose,
}: MemberOverridesEditorProps) {
  const replace = useReplaceMemberPermissionOverrides(workspaceId);
  const [draft, setDraft] = useState<Record<string, OverrideChoice>>(() => toChoices(saved));
  const [error, setError] = useState<string | null>(null);

  const savedChoices = useMemo(() => toChoices(saved), [saved]);
  const groups = useMemo(() => groupPermissions(catalogue), [catalogue]);
  const choiceOf = (choices: Record<string, OverrideChoice>, key: string): OverrideChoice =>
    choices[key] ?? OVERRIDE_CHOICE.default;

  const hasChanges = catalogue.some(
    (permission) => choiceOf(draft, permission.key) !== choiceOf(savedChoices, permission.key),
  );
  const displayName = member.name ?? member.email;

  function save(overrides: PermissionOverride[], successMessage: string): void {
    setError(null);
    replace.mutate(
      { userId: member.userId, input: { overrides } },
      {
        onSuccess: () => {
          toast.success(successMessage);
          onClose();
        },
        onError: (failure) => {
          const message = getErrorMessage(failure, "Couldn't save the overrides. Try again.");
          setError(message);
          toast.error(message);
        },
      },
    );
  }

  function handleSave(): void {
    const overrides = catalogue.flatMap((permission): PermissionOverride[] => {
      const choice = choiceOf(draft, permission.key);
      return choice === OVERRIDE_CHOICE.default
        ? []
        : [{ permissionKey: permission.key, effect: choice }];
    });
    save(overrides, `Permissions updated for ${displayName}`);
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
        <section aria-labelledby="overrides-heading" className="flex flex-col gap-1">
          <h3 id="overrides-heading" className="text-[15px] leading-[22px] font-semibold text-foreground">
            Permission overrides
          </h3>
          <p className="text-xs leading-[18px] text-muted-foreground">
            Overrides beat the role. Allow or deny a single permission for this person.
          </p>
        </section>
        {groups.map((group) => (
          <section key={group.area} aria-label={group.label} className="flex flex-col gap-2">
            <h4 className="text-xs leading-4 font-medium text-muted-foreground">{group.label}</h4>
            <ul className="overflow-hidden rounded-card border border-border">
              {group.permissions.map((permission) => (
                <OverrideRow
                  key={permission.key}
                  permission={permission}
                  grantedByRole={rolePermissions.has(permission.key)}
                  value={choiceOf(draft, permission.key)}
                  saved={choiceOf(savedChoices, permission.key)}
                  callerHolds={canGrant(permission.key)}
                  disabled={replace.isPending}
                  onChange={(choice) =>
                    setDraft((current) => ({ ...current, [permission.key]: choice }))
                  }
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="flex flex-col gap-2 border-t border-border p-4">
        {error && (
          <p role="alert" className="text-xs leading-[18px] text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            disabled={replace.isPending || saved.length === 0}
            onClick={() => save([], `Overrides cleared for ${displayName}`)}
          >
            Clear all overrides
          </Button>
          <Button disabled={replace.isPending || !hasChanges} onClick={handleSave}>
            {replace.isPending ? "Saving" : "Save overrides"}
          </Button>
        </div>
      </div>
    </>
  );
}
