import type { z } from "zod";

import type { apiKeySummarySchema } from "@/api/api-keys";

export type ApiKeySummary = z.infer<typeof apiKeySummarySchema>;
