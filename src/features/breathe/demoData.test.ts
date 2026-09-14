import { describe, expect, it } from 'vitest'
import { FakeRepository } from '../../data/testing/fakeRepository'
import {
  removeAllBreatheData,
  SAMPLE_FORTNIGHT_DAYS,
  SAMPLE_MEDS,
  SAMPLE_PREVENTER_DAY,
  seedSampleFortnight,
} from './demoData'

describe('seedSampleFortnight', () => {
  it('seeds two meds and a full fortnight of check-ins and dose logs', async () => {
    const repo = new FakeRepository()
    const result = await seedSampleFortnight(repo)

    const meds = await repo.listBreatheMeds()
    expect(meds).toHaveLength(SAMPLE_MEDS.length)

    const preventer = meds.find((m) => m.id === result.medIds.preventer)
    expect(preventer?.medType).toBe('controller')
    const reliever = meds.find((m) => m.id === result.medIds.reliever)
    expect(reliever?.medType).toBe('reliever')

    expect(result.days).toHaveLength(SAMPLE_FORTNIGHT_DAYS)
    expect(await repo.listBreatheCheckins()).toHaveLength(SAMPLE_FORTNIGHT_DAYS)

    const doseLogs = await repo.listBreatheDoseLogs()
    expect(doseLogs.length).toBeGreaterThan(0)

    // Preventer shows up daily on its stretch.
    const preventerDoses = doseLogs.filter((d) => d.medId === result.medIds.preventer)
    expect(preventerDoses).toHaveLength(SAMPLE_PREVENTER_DAY)
  })

  it('shapes an early flare then a settled recent week', async () => {
    const repo = new FakeRepository()
    const { medIds, days } = await seedSampleFortnight(repo)

    // Oldest sample day is rougher than today — symptom trend tapers off.
    const first = days[0]?.symptoms ?? 0
    const last = days[days.length - 1]?.symptoms ?? 0
    expect(first).toBeGreaterThan(last)

    const doseLogs = await repo.listBreatheDoseLogs()
    const relieverDoses = doseLogs.filter((d) => d.medId === medIds.reliever)
    const oldestDayCount = relieverDoses.filter((d) => d.date === days[0]?.date).length
    const newestDayCount = relieverDoses.filter((d) => d.date === days[days.length - 1]?.date).length
    expect(oldestDayCount).toBeGreaterThan(newestDayCount)
  })

  it('writes the sample note on today’s check-in', async () => {
    const repo = new FakeRepository()
    const { days } = await seedSampleFortnight(repo)
    const today = days[days.length - 1]?.date
    const checkins = await repo.listBreatheCheckins()
    const todaysCheckin = checkins.find((c) => c.date === today)
    expect(todaysCheckin?.note).toMatch(/remove it anytime/)
  })
})

describe('removeAllBreatheData', () => {
  it('wipes only the breathe collections and leaves other data intact', async () => {
    const repo = new FakeRepository()
    await seedSampleFortnight(repo)
    await repo.upsertJarDay({ date: '2026-09-01', totalSpoons: 2 })
    await repo.addJarLog({ date: '2026-09-01', spent: 1, label: 'tea' })

    await removeAllBreatheData(repo)

    expect(await repo.listBreatheMeds()).toHaveLength(0)
    expect(await repo.listBreatheCheckins()).toHaveLength(0)
    expect(await repo.listBreatheDoseLogs()).toHaveLength(0)

    expect(await repo.getJarDay('2026-09-01')).not.toBeNull()
    expect(await repo.listJarLogs()).toHaveLength(1)
  })
})