import { describe, expect, it } from 'vitest'
import {
  CRISIS_REGIONS,
  DEFAULT_CRISIS_REGION_ID,
} from './crisis'

describe('crisis config', () => {
  it('defaults to the United States region', () => {
    expect(DEFAULT_CRISIS_REGION_ID).toBe('us')
  })

  it('defines 5 regions', () => {
    expect(CRISIS_REGIONS).toHaveLength(5)
  })

  it('keeps the US region first with its 4 expected resources', () => {
    const us = CRISIS_REGIONS.find((r) => r.id === 'us')
    expect(us).toBeDefined()
    expect(us?.label).toBe('United States')

    expect(us?.resources.map((r) => r.name)).toEqual([
      '988 Suicide & Crisis Lifeline',
      'Crisis Text Line',
      'Emergency services',
      'International Association for Suicide Prevention',
    ])
  })
})
