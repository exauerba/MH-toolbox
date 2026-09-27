/**
 * How long a lantern current-level stays live.
 *
 * Kept in the data layer (not the feature) because every repository writes
 * `expiresAt` with it and the UI reads it back to show "expires in 40 min".
 *
 * The window is short on purpose: a signal that stays lit long after the moment
 * it described stops being information and starts being noise. Past the
 * expiry the UI shows "last updated 2h ago" and says nothing else.
 */
export const CURRENT_LEVEL_TTL_MINUTES = 60

/** The `expiresAt` timestamp for a level set at `setAt`. */
export function currentLevelExpiresAt(setAt: Date): string {
  return new Date(setAt.getTime() + CURRENT_LEVEL_TTL_MINUTES * 60_000).toISOString()
}
