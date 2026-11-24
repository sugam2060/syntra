import { z } from "zod";

// Limits mirror the gateway CreateWorkspaceDto and the slug rules in src/workspaces/utils/slug.util.ts.
export const WORKSPACE_NAME_MAX_LENGTH = 100;
export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 48;
/** Lowercase letters and digits in groups separated by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const SLUG_FORMAT_MESSAGE = `Use ${SLUG_MIN_LENGTH} to ${SLUG_MAX_LENGTH} lowercase letters, numbers and single hyphens.`;

export const workspaceSlugSchema = z
  .string()
  .trim()
  .min(SLUG_MIN_LENGTH, SLUG_FORMAT_MESSAGE)
  .max(SLUG_MAX_LENGTH, SLUG_FORMAT_MESSAGE)
  .regex(SLUG_PATTERN, SLUG_FORMAT_MESSAGE);

export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a workspace name.")
  .max(
    WORKSPACE_NAME_MAX_LENGTH,
    `Name must be at most ${WORKSPACE_NAME_MAX_LENGTH} characters.`,
  );

/** Body of `POST /workspaces`. */
export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  slug: workspaceSlugSchema,
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
