import { describe, expect, it } from 'vitest'
import {
  CURRENT_LEVEL_WINDOW_COPY,
  currentLevelState,
  minutesSince,
  minutesUntil,
  timeAgo,
  timeLeft,
} from './currentLevel'
import type { LanternCurrentLevel } from '../../data/types'

const NOW = new Date('2026-03-01T12:00:00.000Z')

function at(iso: string): LanternCurrentLevel {
  return { id: 'c1', levelId: 'lv', setAt: iso, expiresAt: iso }
}

describe('currentLevelState', () => {
  it('is none when nothing is set', () => {
    expect(currentLevelState(null, NOW)).toBe('none')
  })

  it('is live while the window is open', () => {
    const future = new Date(NOW.getTime() + 60_000).toISOString()
    expect(currentLevelState(at(future), NOW)).toBe('live')
  })

  it('is expired once the window has closed', () => {
    const past = new Date(NOW.getTime() - 1_000).toISOString()
    expect(currentLevelState(at(past), NOW)).toBe('expired')
  })
})

describe('minutesSince / minutesUntil', () => {
  it('counts whole minutes, never negative', () => {
    const fiveAgo = new Date(NOW.getTime() - 5 * 60_000).toISOString()
    expect(minutesSince(fiveAgo, NOW)).toBe(5)
    const future = new Date(NOW.getTime() + 5 * 60_000).toISOString()
    expect(minutesSince(future, NOW)).toBe(0)
  })

  it('rounds remaining time up and returns null once past', () => {
    const inNinety = new Date(NOW.getTime() + 90_000).toISOString()
    expect(minutesUntil(inNinety, NOW)).toBe(2)
    const past = new Date(NOW.getTime() - 60_000).toISOString()
    expect(minutesUntil(past, NOW)).toBeNull()
  })
})

describe('timeAgo', () => {
  it('reads naturally across the ranges', () => {
    const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()
    expect(timeAgo(ago(30_000), NOW)).toBe('just now')
    expect(timeAgo(ago(12 * 60_000), NOW)).toBe('12 min ago')
    expect(timeAgo(ago(60 * 60_000), NOW)).toBe('1h ago')
    expect(timeAgo(ago(5 * 3_600_000), NOW)).toBe('5h ago')
    expect(timeAgo(ago(24 * 3_600_000), NOW)).toBe('1 day ago')
    expect(timeAgo(ago(3 * 86_400_000), NOW)).toBe('3 days ago')
  })
})

describe('timeLeft', () => {
  it('counts down, then reports expiry', () => {
    const in40 = new Date(NOW.getTime() + 40 * 60_000).toISOString()
    expect(timeLeft(in40, NOW)).toBe('40 min left')
    const inTwoHours = new Date(NOW.getTime() + 2 * 3_600_000).toISOString()
    expect(timeLeft(inTwoHours, NOW)).toBe('2h left')
    expect(timeLeft(new Date(NOW.getTime() - 1).toISOString(), NOW)).toBe('expired')
  })
})

describe('CURRENT_LEVEL_WINDOW_COPY', () => {
  it('tells the user how long a level stays live', () => {
    expect(CURRENT_LEVEL_WINDOW_COPY).toBe('60 minutes')
  })
})
