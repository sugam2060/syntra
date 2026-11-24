import type { z } from "zod";

import type { permissionInfoSchema } from "@/api/workspaces";

export type PermissionInfo = z.infer<typeof permissionInfoSchema>;
