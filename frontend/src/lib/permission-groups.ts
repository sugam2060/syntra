import type { PermissionGroup } from "@/types/members";
import type { PermissionInfo } from "@/types/shared";

const AREA_LABELS: Readonly<Record<string, string>> = {
  workspace: "Workspace",
  member: "Members",
  project: "Projects",
  task: "Tasks",
  comment: "Comments",
  ai: "AI",
};

/** The area of a permission code: the part before the colon, so `task:assign` is in `task`. */
export function getPermissionArea(key: string): string {
  return key.split(":")[0] ?? key;
}

function labelForArea(area: string): string {
  return AREA_LABELS[area] ?? `${area.charAt(0).toUpperCase()}${area.slice(1)}`;
}

/** Groups the catalogue by area, keeping the order the gateway sent both for areas and for codes inside them. */
export function groupPermissions(catalogue: readonly PermissionInfo[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const permission of catalogue) {
    const area = getPermissionArea(permission.key);
    const group = groups.get(area);
    if (group) {
      group.permissions.push(permission);
    } else {
      groups.set(area, { area, label: labelForArea(area), permissions: [permission] });
    }
  }
  return [...groups.values()];
}
