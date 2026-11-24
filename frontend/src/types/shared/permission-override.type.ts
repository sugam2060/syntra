import type { z } from "zod";

import type { permissionOverrideSchema } from "@/api/workspaces";

export type PermissionOverride = z.infer<typeof permissionOverrideSchema>;
