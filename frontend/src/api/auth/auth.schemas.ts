import { z } from "zod";

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  emailVerified: z.boolean(),
  avatarUrl: z.string().nullable(),
});

/** Body returned by login and refresh. The refresh token travels in an httpOnly cookie. */
export const authResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  /** Access token lifetime in seconds. */
  expiresIn: z.number(),
  user: authUserSchema,
});

/** Body returned by register: the new user only, no token and no cookie. */
export const registerResponseSchema = z.object({
  user: authUserSchema,
});
