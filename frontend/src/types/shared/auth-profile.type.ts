import type { z } from "zod";

import type { authProfileSchema } from "@/api/auth";

export type AuthProfile = z.infer<typeof authProfileSchema>;
