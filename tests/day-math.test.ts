import { dayForDate, fromISODate, toISODate, todayForResetHour } from '../src/shared/day'

describe('dayForDate', () => {
  it('reset 0 keeps the calendar day', () => {
    expect(dayForDate(new Date(2026, 7, 16, 23, 59), 0)).toBe('2026-08-16')
    expect(dayForDate(new Date(2026, 7, 16, 0, 0), 0)).toBe('2026-08-16')
  })

  it('reset 4: before 4am belongs to the previous day', () => {
    expect(dayForDate(new Date(2026, 7, 16, 3, 59), 4)).toBe('2026-08-15')
    expect(dayForDate(new Date(2026, 7, 16, 4, 0), 4)).toBe('2026-08-16')
  })

  it('rolls across month boundaries', () => {
    expect(dayForDate(new Date(2026, 0, 1, 2, 0), 4)).toBe('2025-12-31')
    expect(dayForDate(new Date(2026, 1, 28, 1, 0), 4)).toBe('2026-02-27')
    expect(dayForDate(new Date(2026, 2, 1, 1, 0), 4)).toBe('2026-02-28')
  })

  it('rolls across year boundaries', () => {
    expect(dayForDate(new Date(2026, 0, 1, 2, 0), 4)).toBe('2025-12-31')
  })

  it('is pure wall-clock arithmetic across DST transitions', () => {
    // US DST spring-forward: Mar 8 2026, 3:30am does not exist on the wall clock,
    // but the shift is applied to the wall-clock time regardless of TZ.
    expect(dayForDate(new Date(2026, 2, 8, 3, 30), 4)).toBe('2026-03-07')
    // Fall-back: Nov 1 2026, 1:30am happens twice; still rolls back by 4h.
    expect(dayForDate(new Date(2026, 10, 1, 1, 30), 4)).toBe('2026-10-31')
  })
})

describe('toISODate / fromISODate', () => {
  it('round-trips a local date', () => {
    const d = new Date(2026, 7, 16, 12, 0)
    expect(toISODate(d)).toBe('2026-08-16')
    const back = fromISODate('2026-08-16')
    expect(back.getFullYear()).toBe(2026)
    expect(back.getMonth()).toBe(7)
    expect(back.getDate()).toBe(16)
  })

  it('uses local time, never UTC', () => {
    // 2026-08-16 00:30 local is still 2026-08-15 in UTC+2 — must stay local.
    const d = new Date(2026, 7, 16, 0, 30)
    expect(toISODate(d)).toBe('2026-08-16')
  })
})

describe('todayForResetHour', () => {
  it('reset 0 is today', () => {
    expect(todayForResetHour(0)).toBe(toISODate(new Date()))
  })
})