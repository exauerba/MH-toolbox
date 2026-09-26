import { describe, expect, it } from 'vitest'
import type { LanternLevel } from '../../data/types'
import { CRISIS_LEVEL_COUNT, isCrisisLevel, toneForLevel, toneGuidance } from './present'

function level(position: number): LanternLevel {
  return {
    id: crypto.randomUUID(),
    position,
    label: `Level ${position}`,
    description: '',
    actions: [],
  }
}

describe('isCrisisLevel', () => {
  it('flags only the top two levels of a 10-point scale', () => {
    expect(isCrisisLevel(level(8), 10)).toBe(false)
    expect(isCrisisLevel(level(9), 10)).toBe(true)
    expect(isCrisisLevel(level(10), 10)).toBe(true)
  })

  it('flags the top two of a short scale too', () => {
    expect(isCrisisLevel(level(1), 3)).toBe(false)
    expect(isCrisisLevel(level(2), 3)).toBe(true)
    expect(isCrisisLevel(level(3), 3)).toBe(true)
  })

  it('exposes the crisis count constant', () => {
    expect(CRISIS_LEVEL_COUNT).toBe(2)
  })
})

describe('toneForLevel', () => {
  it('splits a 10-point scale into calm / rising / high / crisis', () => {
    expect(toneForLevel(level(1), 10)).toBe('calm')
    expect(toneForLevel(level(3), 10)).toBe('calm')
    expect(toneForLevel(level(4), 10)).toBe('rising')
    expect(toneForLevel(level(6), 10)).toBe('rising')
    expect(toneForLevel(level(7), 10)).toBe('high')
    expect(toneForLevel(level(8), 10)).toBe('high')
    expect(toneForLevel(level(9), 10)).toBe('crisis')
    expect(toneForLevel(level(10), 10)).toBe('crisis')
  })

  it('keeps the top two crisis on a 3-point scale', () => {
    expect(toneForLevel(level(1), 3)).toBe('calm')
    expect(toneForLevel(level(2), 3)).toBe('crisis')
    expect(toneForLevel(level(3), 3)).toBe('crisis')
  })
})

describe('toneGuidance', () => {
  it('returns warm guidance for every tone', () => {
    for (const tone of ['calm', 'rising', 'high', 'crisis'] as const) {
      expect(toneGuidance(tone).length).toBeGreaterThan(0)
    }
  })
})