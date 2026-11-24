import type { PermissionGroup } from "@/types/api-keys";
import type { PermissionInfo } from "@/types/shared";

/** Codes that a key can never use: key management needs a signed-in user, so offering it would mislead. */
const NOT_GRANTABLE: ReadonlySet<string> = new Set(["ai:manage_keys"]);

/** The permission a new key starts with. */
export const DEFAULT_KEY_PERMISSION = "ai:use";

const AREA_ORDER = ["workspace", "member", "project", "task", "comment", "ai"];

function areaOf(code: string): string {
  const [area] = code.split(":");
  return area ?? code;
}

function areaRank(area: string): number {
  const index = AREA_ORDER.indexOf(area);
  return index === -1 ? AREA_ORDER.length : index;
}

/** Groups the catalogue by the part before the colon, in a stable reading order. */
export function groupGrantablePermissions(catalogue: readonly PermissionInfo[]): PermissionGroup[] {
  const groups = new Map<string, PermissionInfo[]>();
  for (const permission of catalogue) {
    if (NOT_GRANTABLE.has(permission.key)) {
      continue;
    }
    const area = areaOf(permission.key);
    groups.set(area, [...(groups.get(area) ?? []), permission]);
  }
  return [...groups.entries()]
    .map(([area, permissions]) => ({ area, permissions }))
    .sort((a, b) => areaRank(a.area) - areaRank(b.area));
}
