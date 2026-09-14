import type { ToolboxRepository } from '../../data/repository'
import type { BreatheCheckinInput, BreatheDoseLogInput, BreatheMedInput } from '../../data/types'

/**
 * Deterministic ~14-day "sample fortnight" — same data every time, so tests
 * and the visualizations always see the same controlled-then-flare shape.
 *
 * Days 1–7: controlled stretch (low symptoms, daily preventer).
 * Days 8–14: flare-up stretch (rising symptoms, more reliever doses).
 */

export const SAMPLE_MEDS: BreatheMedInput[] = [
  { name: 'Seretide (preventer)', medType: 'controller', reminderHour: 8 },
  { name: 'Ventolin (reliever)', medType: 'reliever', reminderHour: null },
]

export const SAMPLE_PREVENTER_DAY = 7
export const SAMPLE_FORTNIGHT_DAYS = 14

function isoLocalDate(offsetDays: number, now: Date): string {
  const d = new Date(now)
  d.setDate(d.getDate() - offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function symptomsForDay(offsetDays: number): number {
  const progress = offsetDays / (SAMPLE_FORTNIGHT_DAYS - 1) // 0 → 1
  // Sine wave: starts ~2, dips to ~1, climbs to ~4 by the end.
  return Math.min(5, Math.max(1, Math.round(2 + Math.sin((progress + 1.2) * Math.PI) * 1.6)))
}

function preventerDoseDay(offsetDays: number): boolean {
  return offsetDays < SAMPLE_PREVENTER_DAY
}

function relieverDoseTimes(offsetDays: number): string[] {
  if (offsetDays < SAMPLE_PREVENTER_DAY) return ['09:15']
  const extra = offsetDays - SAMPLE_PREVENTER_DAY + 1
  const times = ['20:05']
  for (let i = 0; i < Math.min(2, extra); i++) times.push(`${10 + i}`.padStart(2, '0') + ':45')
  // Slightly varied timing so the time-of-day chart looks organic.
  return times
}

export interface SampleSeedResult {
  medIds: { preventer: string; reliever: string }
  days: { date: string; symptoms: number }[]
}

/**
 * Writes the sample fortnight through the repository. Idempotent per run:
 * each call creates fresh meds/check-ins/dose logs (the caller owns the
 * "remove sample data" flow). Returns the created IDs for the caller to track.
 */
export async function seedSampleFortnight(repo: ToolboxRepository): Promise<SampleSeedResult> {
  const now = new Date()

  const preventer = await repo.saveBreatheMed(SAMPLE_MEDS[0])
  const reliever = await repo.saveBreatheMed(SAMPLE_MEDS[1])

  const days: SampleSeedResult['days'] = []

  for (let offset = SAMPLE_FORTNIGHT_DAYS - 1; offset >= 0; offset--) {
    const date = isoLocalDate(offset, now)
    const symptoms = symptomsForDay(offset)

    const checkin: BreatheCheckinInput = {
      date,
      symptoms,
      sleep: Math.min(5, Math.max(1, 5 - symptoms + 1)),
      activity: Math.min(5, Math.max(1, symptoms)),
      peakFlow: 500 - symptoms * 30,
      note: offset === 0 ? 'Sample data — you can remove it anytime.' : null,
    }
    await repo.saveBreatheCheckin(checkin)

    const doseLogs: BreatheDoseLogInput[] = []
    if (preventerDoseDay(offset)) {
      doseLogs.push({ medId: preventer.id, date, time: '08:15' })
    }
    for (const time of relieverDoseTimes(offset)) {
      doseLogs.push({ medId: reliever.id, date, time })
    }
    for (const d of doseLogs) await repo.addBreatheDoseLog(d)

    days.push({ date, symptoms })
  }

  return { medIds: { preventer: preventer.id, reliever: reliever.id }, days }
}

/**
 * Removes every Breathe collection (meds, check-ins, dose logs) — the
 * "Remove sample data" affordance wipes only the breathe tool, never jar or
 * timeline data.
 */
export async function removeAllBreatheData(repo: ToolboxRepository): Promise<void> {
  const [meds, checkins, doseLogs] = await Promise.all([
    repo.listBreatheMeds(),
    repo.listBreatheCheckins(),
    repo.listBreatheDoseLogs(),
  ])

  for (const m of meds) await repo.deleteBreatheMed(m.id)
  for (const c of checkins) await repo.deleteBreatheCheckin(c.id)
  for (const d of doseLogs) await repo.deleteBreatheDoseLog(d.id)
}