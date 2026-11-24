import type { PermissionInfo } from "@/types/shared";

/** Permissions that share an area, the part of the code before the colon (`task` in `task:assign`). */
export type PermissionGroup = {
  area: string;
  label: string;
  permissions: PermissionInfo[];
};
