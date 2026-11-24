"use client";

import { useSlugAvailability } from "@/api/workspaces";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { workspaceSlugSchema } from "@/types/schema";
import { SLUG_STATUS, type SlugStatus } from "@/types/shared";

const CHECK_DELAY_MS = 400;

/**
 * What is known about a typed workspace slug. The format is checked locally; only a well-formed slug
 * that has stopped changing is sent to the gateway, because that route is strictly rate limited.
 *
 * Pass `currentSlug` when editing an existing workspace: the gateway answers `taken` for a workspace's
 * own slug, so the unchanged value is reported as `current` and never sent.
 */
export function useSlugStatus(slug: string, currentSlug?: string): SlugStatus {
  const typed = slug.trim();
  const settled = useDebouncedValue(typed, CHECK_DELAY_MS);
  const isWellFormed = workspaceSlugSchema.safeParse(typed).success;
  const isSettled = settled === typed;
  const isCurrent = currentSlug !== undefined && typed === currentSlug;

  const availability = useSlugAvailability(
    isWellFormed && isSettled && !isCurrent ? typed : null,
  );

  if (typed === "") {
    return SLUG_STATUS.idle;
  }
  if (isCurrent) {
    return SLUG_STATUS.current;
  }
  if (!isWellFormed) {
    return SLUG_STATUS.invalid;
  }
  if (!isSettled || availability.isPending) {
    return SLUG_STATUS.checking;
  }
  if (availability.isError) {
    return SLUG_STATUS.unknown;
  }
  if (availability.data.available) {
    return SLUG_STATUS.available;
  }
  switch (availability.data.reason) {
    case "taken":
      return SLUG_STATUS.taken;
    case "reserved":
      return SLUG_STATUS.reserved;
    default:
      return SLUG_STATUS.invalid;
  }
}
