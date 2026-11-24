import { SLUG_MAX_LENGTH } from "@/types/schema";

/**
 * Turns a workspace name into a URL slug: lowercase letters and digits joined by single hyphens.
 * "Acme Product!" becomes "acme-product". Returns "" when nothing usable is left.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}
