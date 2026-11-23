import type { z } from "zod";

import type { authResponseSchema } from "@/api/auth";

export type AuthResponse = z.infer<typeof authResponseSchema>;
