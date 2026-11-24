import { z } from "zod";

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  emailVerified: z.boolean(),
  avatarUrl: z.string().nullable(),
});

/** Body of `GET /authentication/me`: the user plus how they can sign in. */
export const authProfileSchema = authUserSchema.extend({
  hasPassword: z.boolean(),
  /** Linked social accounts, for example `["google"]`. */
  providers: z.array(z.string()),
});

/** Body returned by login and refresh. The refresh token travels in an httpOnly cookie. */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  /** Access token lifetime in seconds. */
  expiresIn: z.number(),
  user: authUserSchema,
});

/** Body of `POST /authentication/google/link`: where to send the browser. Must be an https URL. */
export const googleLinkResponseSchema = z.object({
  url: z.url({ protocol: /^https$/ }),
});

/** Body returned by register: the new user only, no token and no cookie. */
export const registerResponseSchema = z.object({
  user: authUserSchema,
});
