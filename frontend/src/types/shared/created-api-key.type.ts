import type { z } from "zod";

import type { createdApiKeySchema } from "@/api/api-keys";

/** A freshly created key with its plaintext `key`. Hold it only as long as the reveal dialog is open. */
export type CreatedApiKey = z.infer<typeof createdApiKeySchema>;
