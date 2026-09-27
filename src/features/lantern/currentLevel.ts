import { CURRENT_LEVEL_TTL_MINUTES } from '../../data/lanternTtl'
import type { LanternCurrentLevel } from '../../data/types'

/** Where a current level sits in its life: never set, live, or timed out. */
export type CurrentLevelState = 'none' | 'live' | 'expired'

export function currentLevelState(
  current: LanternCurrentLevel | null,
  now: Date = new Date(),
): CurrentLevelState {
  if (!current) return 'none'
  return new Date(current.expiresAt).getTime() > now.getTime() ? 'live' : 'expired'
}

/** Whole minutes since an ISO timestamp (never negative). */
export function minutesSince(iso: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000))
}

/** Whole minutes left before an ISO timestamp; null once it has passed. */
export function minutesUntil(iso: string, now: Date = new Date()): number | null {
  const left = Math.ceil((new Date(iso).getTime() - now.getTime()) / 60_000)
  return left > 0 ? left : null
}

/** "just now" / "12 min ago" / "3h ago" / "2 days ago". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const mins = minutesSince(iso, now)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours === 1 ? '1h ago' : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

/** "40 min left" / "expired" — for the live countdown beside a set level. */
export function timeLeft(expiresAt: string, now: Date = new Date()): string {
  const mins = minutesUntil(expiresAt, now)
  if (mins === null) return 'expired'
  if (mins < 60) return `${mins} min left`
  const hours = Math.floor(mins / 60)
  return hours === 1 ? '1h left' : `${hours}h left`
}

/** How long a level stays live, as copy for the set-level sheet. */
export const CURRENT_LEVEL_WINDOW_COPY = `${CURRENT_LEVEL_TTL_MINUTES} minutes`
