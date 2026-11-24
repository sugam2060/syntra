import type { z } from "zod";

import type { slugAvailabilitySchema } from "@/api/workspaces";

export type SlugAvailability = z.infer<typeof slugAvailabilitySchema>;
