import { describe, expect, it } from 'vitest'
import type { BreatheCheckin, BreatheDoseLog, BreatheMed } from '../../data/types'
import {
  controlState,
  correlations,
  spearman,
  spearmanStrength,
  whatHelpedDelta,
} from './scoring'

function checkin(overrides: Partial<BreatheCheckin>): BreatheCheckin {
  return {
    id: crypto.randomUUID(),
    date: '2026-09-01',
    peakFlow: null,
    symptoms: null,
    sleep: null,
    activity: null,
    note: null,
    createdAt: '2026-09-01T08:00:00.000Z',
    ...overrides,
  }
}

function med(id: string, medType: BreatheMed['medType'] = 'controller'): BreatheMed {
  return {
    id,
    name: id,
    medType,
    reminderHour: null,
    createdAt: '2026-09-01T08:00:00.000Z',
  }
}

function dose(medId: string, date: string): BreatheDoseLog {
  return {
    id: crypto.randomUUID(),
    medId,
    date,
    time: '08:00',
    trigger: [],
    createdAt: '2026-09-01T08:00:00.000Z',
  }
}

describe('controlState', () => {
  it('reports No data when there are no check-ins', () => {
    const state = controlState([], [], [])
    expect(state.label).toBe('No data')
    expect(state.score).toBe(0)
    expect(state.copy).toMatch(/add a check-in/i)
  })

  it('labels low symptoms as Controlled', () => {
    const checkins = [
      checkin({ symptoms: 1, date: '2026-09-01' }),
      checkin({ symptoms: 1, date: '2026-09-02' }),
    ]
    const state = controlState(checkins, [], [])
    expect(state.label).toBe('Controlled')
    expect(state.score).toBeGreaterThanOrEqual(70)
  })

  it('labels high symptoms as Uncontrolled', () => {
    const checkins = [
      checkin({ symptoms: 5, date: '2026-09-01' }),
      checkin({ symptoms: 5, date: '2026-09-02' }),
    ]
    const state = controlState(checkins, [], [])
    expect(state.label).toBe('Uncontrolled')
    expect(state.score).toBeLessThan(45)
  })

  it('labels middling symptoms as Partly controlled', () => {
    const checkins = [
      checkin({ symptoms: 3, date: '2026-09-01' }),
      checkin({ symptoms: 3, date: '2026-09-02' }),
    ]
    const state = controlState(checkins, [], [])
    expect(state.label).toBe('Partly controlled')
    expect(state.score).toBeGreaterThanOrEqual(45)
  })

  it('rewards preventer coverage days', () => {
    const preventer = med('p1')
    const checkins = [
      checkin({ symptoms: 2, date: '2026-09-01' }),
      checkin({ symptoms: 4, date: '2026-09-02' }),
    ]
    const logs = [dose(preventer.id, '2026-09-01')]
    const withCoverage = controlState(checkins, logs, [preventer])
    const withoutCoverage = controlState(checkins, [], [preventer])
    expect(withCoverage.score).toBeGreaterThan(withoutCoverage.score)
  })

  it('clamps the score to 0–100', () => {
    const extreme = [checkin({ symptoms: 5, date: '2026-09-01' })]
    const state = controlState(extreme, [], [])
    expect(state.score).toBeGreaterThanOrEqual(0)
    expect(state.score).toBeLessThanOrEqual(100)
  })
})

describe('whatHelpedDelta', () => {
  const preventerDay = '2026-09-01'
  const plainDay = '2026-09-02'
  const preventer = med('p1')
  const preventerLogs = [dose(preventer.id, preventerDay), dose(preventer.id, '2026-09-03')]

  it('needs at least two check-ins', () => {
    const insight = whatHelpedDelta([checkin({ symptoms: 2 })], [], [])
    expect(insight.delta).toBeNull()
    expect(insight.sentence).toMatch(/add a few check-ins/i)
  })

  it('reports a positive delta when preventer days feel better', () => {
    const checkins = [
      checkin({ symptoms: 1, date: preventerDay }),
      checkin({ symptoms: 1, date: '2026-09-03', }),
      checkin({ symptoms: 4, date: plainDay }),
      checkin({ symptoms: 4, date: '2026-09-04' }),
    ]
    const insight = whatHelpedDelta(checkins, preventerLogs, [preventer])
    expect(insight.avgWith).toBe(1)
    expect(insight.avgWithout).toBe(4)
    expect(insight.delta).toBe(3)
    expect(insight.sentence).toMatch(/3\.0 points lower/i)
  })

  it('returns null delta when one side has no readings', () => {
    const checkins = [
      checkin({ symptoms: 1, date: preventerDay }),
      checkin({ symptoms: 2, date: preventerDay }),
    ]
    const insight = whatHelpedDelta(checkins, preventerLogs, [preventer])
    expect(insight.delta).toBeNull()
    expect(insight.sentence).toMatch(/compare days/i)
  })

  it('says no clear difference when deltas are negligible', () => {
    const checkins = [
      checkin({ symptoms: 2, date: preventerDay }),
      checkin({ symptoms: 2, date: plainDay }),
    ]
    const insight = whatHelpedDelta(checkins, preventerLogs, [preventer])
    expect(insight.delta).toBe(0)
    expect(insight.sentence).toMatch(/no clear difference/i)
  })
})

describe('spearman', () => {
  it('returns null for fewer than two pairs', () => {
    expect(spearman([1], [2])).toBeNull()
  })

  it('returns 1 for a perfect monotonic match', () => {
    expect(spearman([1, 2, 3], [1, 2, 3])).toBe(1)
  })

  it('returns -1 for a perfect inverse match', () => {
    expect(spearman([1, 2, 3], [3, 2, 1])).toBe(-1)
  })

  it('handles ties with average ranks', () => {
    expect(spearman([1, 1, 2], [1, 1, 2])).toBe(1)
  })

  it('drops unpaired values', () => {
    expect(spearman([1, 2, 3], [1, 2])).toBe(1)
  })
})

describe('spearmanStrength', () => {
  it('classifies by magnitude', () => {
    expect(spearmanStrength(0.8)).toBe('strong')
    expect(spearmanStrength(-0.8)).toBe('strong')
    expect(spearmanStrength(0.5)).toBe('moderate')
    expect(spearmanStrength(0.2)).toBe('weak')
  })
})

describe('correlations', () => {
  it('returns null rhos when no paired data exists', () => {
    const cells = correlations([])
    expect(cells.length).toBe(6)
    expect(cells.every((c) => c.rho === null)).toBe(true)
    expect(cells.some((c) => c.a === 'Symptoms ↔ Sleep')).toBe(true)
  })

  it('finds a strong correlation between two co-moving fields', () => {
    const checkins = [
      checkin({ symptoms: 1, activity: 1, date: '2026-09-01' }),
      checkin({ symptoms: 2, activity: 2, date: '2026-09-02' }),
      checkin({ symptoms: 3, activity: 3, date: '2026-09-03' }),
    ]
    const cells = correlations(checkins)
    const pair = cells.find((c) => c.a === 'Symptoms ↔ Activity')
    expect(pair?.rho).not.toBeNull()
    expect(pair && pair.rho != null ? pair.rho : 0).toBeGreaterThan(0.9)
  })
})