/** Why a slug cannot be used. */
export type SlugUnavailableReason = 'invalid' | 'reserved' | 'taken';

/** Answer of `GET workspaces/slug-availability`. */
export interface SlugAvailability {
  slug: string;
  available: boolean;
  /** `null` when the slug is available. */
  reason: SlugUnavailableReason | null;
}
