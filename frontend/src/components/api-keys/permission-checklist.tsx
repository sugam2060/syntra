import { PermissionOption } from "@/components/api-keys/permission-option";
import { Skeleton } from "@/components/ui/skeleton";
import type { PermissionGroup } from "@/types/api-keys";

type PermissionChecklistProps = {
  groups: readonly PermissionGroup[];
  selected: readonly string[];
  canGrant: (code: string) => boolean;
  disabled: boolean;
  isLoading: boolean;
  /** Message and retry shown instead of the list when the catalogue or the caller's role failed to load. */
  loadError: { message: string; onRetry: () => void } | null;
  onChange: (next: string[]) => void;
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Permissions grouped by area (workspace, project, task, ...), each with its mono code and description. */
export function PermissionChecklist({
  groups,
  selected,
  canGrant,
  disabled,
  isLoading,
  loadError,
  onChange,
}: PermissionChecklistProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }
  if (loadError) {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs"
      >
        <span>{loadError.message}</span>
        <button
          type="button"
          onClick={loadError.onRetry}
          className="font-medium text-destructive hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  function toggle(code: string, checked: boolean): void {
    const without = selected.filter((entry) => entry !== code);
    onChange(checked ? [...without, code] : without);
  }

  return (
    <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto rounded-lg border border-border p-2">
      {groups.map((group) => (
        <div
          key={group.area}
          role="group"
          aria-labelledby={`permission-area-${group.area}`}
          className="flex flex-col"
        >
          <p
            id={`permission-area-${group.area}`}
            className="px-2 pb-1 text-xs font-medium text-muted-foreground"
          >
            {capitalize(group.area)}
          </p>
          {group.permissions.map((permission) => (
            <PermissionOption
              key={permission.key}
              permission={permission}
              checked={selected.includes(permission.key)}
              grantable={canGrant(permission.key)}
              disabled={disabled}
              onCheckedChange={(checked) => toggle(permission.key, checked)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
