import { describe, expect, it } from 'vitest'
import type { LanternScale } from '../../data/types'
import { formatLevelForText, formatScaleForText } from './format'
import { STARTER_LEVELS, buildStarterScale } from './starterScale'

function scale(overrides: Partial<LanternScale> = {}): LanternScale {
  return {
    id: crypto.randomUUID(),
    name: 'My Lantern',
    levelCount: 2,
    levels: [
      { id: 'a', position: 1, label: 'Grounded', description: 'I feel okay.', actions: ['Say hi'] },
      { id: 'b', position: 2, label: 'Uneasy', description: 'On edge.', actions: ['Sit with me', 'Stay close'] },
    ],
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
  }
}

describe('formatLevelForText', () => {
  it('renders number, label, description and actions', () => {
    const text = formatLevelForText(scale().levels[0])
    expect(text).toContain('1. Grounded')
    expect(text).toContain('I feel okay.')
    expect(text).toContain('What helps: Say hi')
  })

  it('omits the actions line when there are none', () => {
    const text = formatLevelForText({ ...scale().levels[0], actions: [] })
    expect(text).not.toContain('What helps')
  })
})

describe('formatScaleForText', () => {
  it('renders a header and every level in position order', () => {
    const text = formatScaleForText(scale())
    expect(text).toContain('My Lantern — where I am, and what helps')
    expect(text.indexOf('1. Grounded')).toBeLessThan(text.indexOf('2. Uneasy'))
  })
})

describe('starter scale', () => {
  it('has ten levels, positions 1–10, all with labels and actions', () => {
    expect(STARTER_LEVELS).toHaveLength(10)
    const built = buildStarterScale()
    expect(built.levelCount).toBe(10)
    built.levels.forEach((l, i) => {
      expect(l.position).toBe(i + 1)
      expect(l.label.length).toBeGreaterThan(0)
      expect(l.description.length).toBeGreaterThan(0)
      expect(l.actions.length).toBeGreaterThan(0)
    })
  })

  it('builds fresh ids on every call', () => {
    const a = buildStarterScale()
    const b = buildStarterScale()
    expect(a.levels[0].id).not.toBe(b.levels[0].id)
  })
})