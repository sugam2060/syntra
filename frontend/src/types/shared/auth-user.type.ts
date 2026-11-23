import type { z } from "zod";

import type { authUserSchema } from "@/api/auth";

export type AuthUser = z.infer<typeof authUserSchema>;
