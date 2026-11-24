import { z } from "zod";

import { parseLocalDate, startOfTomorrow } from "@/lib/local-date";

// Limits mirror the gateway CreateApiKeyDto.
export const API_KEY_NAME_MAX_LENGTH = 100;

/** How long a new key stays valid. Only `custom` uses the date field. */
export const API_KEY_EXPIRATION = {
  days30: "30-days",
  days90: "90-days",
  year1: "1-year",
  custom: "custom",
  never: "never",
} as const;

export type ApiKeyExpiration = (typeof API_KEY_EXPIRATION)[keyof typeof API_KEY_EXPIRATION];

export const CUSTOM_DATE_MESSAGE = "Pick a date after today.";

/** Form values of the create-key dialog. */
export const createApiKeySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name for this key.")
      .max(API_KEY_NAME_MAX_LENGTH, `Name must be at most ${API_KEY_NAME_MAX_LENGTH} characters.`),
    permissions: z.array(z.string()).min(1, "Choose at least one permission."),
    expiration: z.enum([
      API_KEY_EXPIRATION.days30,
      API_KEY_EXPIRATION.days90,
      API_KEY_EXPIRATION.year1,
      API_KEY_EXPIRATION.custom,
      API_KEY_EXPIRATION.never,
    ]),
    /** `yyyy-mm-dd` from a date input; used only when `expiration` is `custom`. */
    customDate: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.expiration !== API_KEY_EXPIRATION.custom) {
      return;
    }
    const date = parseLocalDate(value.customDate);
    if (!date || date.getTime() < startOfTomorrow(new Date()).getTime()) {
      ctx.addIssue({ code: "custom", message: CUSTOM_DATE_MESSAGE, path: ["customDate"] });
    }
  });

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

/** Body of `POST /workspaces/:workspaceId/api-keys`. Omit `expiresAt` for a key that never expires. */
export const createApiKeyRequestSchema = z.object({
  name: z.string().trim().min(1).max(API_KEY_NAME_MAX_LENGTH),
  permissions: z.array(z.string()).min(1),
  expiresAt: z.iso.datetime().optional(),
});

export type CreateApiKeyRequest = z.infer<typeof createApiKeyRequestSchema>;
