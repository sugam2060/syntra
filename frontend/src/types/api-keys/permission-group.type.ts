import type { PermissionInfo } from "@/types/shared";

/** Permissions that share a prefix before the colon, such as every `task:*` code. */
export type PermissionGroup = {
  area: string;
  permissions: PermissionInfo[];
};
