import type { LanternLevel } from '../../data/types'

/**
 * Present-mode helpers: how urgent a level is, and how the UI should
 * carry it. Never color-alone — tone drives copy, icon and layout too.
 */

export type LanternTone = 'calm' | 'rising' | 'high' | 'crisis'

/** The top two levels always carry crisis support. */
export const CRISIS_LEVEL_COUNT = 2

/** Only `position` matters here, so shared (read-only) levels work too. */
export type LevelPosition = Pick<LanternLevel, 'position'>

export function isCrisisLevel(level: LevelPosition, levelCount: number): boolean {
  return level.position >= levelCount - CRISIS_LEVEL_COUNT + 1
}

/**
 * Splits the scale into thirds for tone. The top two levels are always
 * 'crisis' regardless of scale length.
 */
export function toneForLevel(level: LevelPosition, levelCount: number): LanternTone {
  if (isCrisisLevel(level, levelCount)) return 'crisis'
  const calmUpTo = Math.floor(levelCount / 3)
  const risingUpTo = Math.floor((levelCount * 2) / 3)
  if (level.position <= calmUpTo) return 'calm'
  if (level.position <= risingUpTo) return 'rising'
  return 'high'
}

/** Short, warm guidance for the supporter, per tone. */
export function toneGuidance(tone: LanternTone): string {
  switch (tone) {
    case 'calm':
      return 'Easy company is enough.'
    case 'rising':
      return 'Stay close and keep it simple.'
    case 'high':
      return 'Take the lead — small steps, low pressure.'
    case 'crisis':
      return 'Stay with them. Crisis support is here.'
  }
}