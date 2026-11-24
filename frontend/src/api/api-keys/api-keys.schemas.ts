import { z } from "zod";

/** An API key as listed by the gateway. The key itself is never part of it. Dates arrive as ISO strings. */
export const apiKeySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** `sk_` plus the first 8 characters of the key: enough to recognise it. */
  keyPrefix: z.string(),
  permissions: z.array(z.string()),
  /** Id of the user the key acts for. The gateway sends no name; resolve it from the member list. */
  createdBy: z.string(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  /** Approximate: the gateway updates it at most every 5 minutes. */
  lastUsedAt: z.string().nullable(),
});

/** Answer of `POST /api-keys`: the summary plus the plaintext key, which is never available again. */
export const createdApiKeySchema = apiKeySummarySchema.extend({
  key: z.string(),
});
