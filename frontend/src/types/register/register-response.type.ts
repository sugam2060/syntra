import type { z } from "zod";

import type { registerResponseSchema } from "@/api/auth";

export type RegisterResponse = z.infer<typeof registerResponseSchema>;
