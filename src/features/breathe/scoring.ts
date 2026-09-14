import type { BreatheCheckin, BreatheDoseLog, BreatheMed } from '../../data/types'

export interface ControlState {
  score: number // 0–100, higher = better controlled
  label: 'Controlled' | 'Partly controlled' | 'Uncontrolled' | 'No data'
  copy: string
}

/**
 * A simple, deterministic control score from the available data:
 *   - fewer symptoms → better
 *   - working preventer + reliever pattern → better
 *   0 check-ins → No data.
 */
export function controlState(
  checkins: BreatheCheckin[],
  doseLogs: BreatheDoseLog[],
  meds: BreatheMed[],
): ControlState {
  if (checkins.length === 0) {
    return {
      score: 0,
      label: 'No data',
      copy: 'Add a check-in to see your control score.',
    }
  }

  const symptomVals = checkins
    .map((c) => c.symptoms)
    .filter((v): v is number => v != null)

  const symptomAvg = symptomVals.length ? symptomVals.reduce((a, b) => a + b, 0) / symptomVals.length : 3

  const preventerIds = new Set(
    meds.filter((m) => m.medType === 'controller').map((m) => m.id),
  )
  const preventerDays = new Set(
    doseLogs.filter((d) => preventerIds.has(d.medId)).map((d) => d.date),
  )
  const withPreventer = checkins.filter((c) => preventerDays.has(c.date)).length

  // Start at 100, subtract symptoms, reward preventer coverage.
  let score = 100 - symptomAvg * 14
  if (checkins.length > 0) {
    score += (withPreventer / checkins.length) * 10
  }
  score = Math.max(0, Math.min(100, Math.round(score)))

  if (score >= 70) {
    return {
      score,
      label: 'Controlled',
      copy: 'Your symptoms and medication pattern are looking steady.',
    }
  }
  if (score >= 45) {
    return {
      score,
      label: 'Partly controlled',
      copy: 'Some symptom signals — check your medication routine.',
    }
  }
  return {
    score,
    label: 'Uncontrolled',
    copy: 'Symptoms are high — consider reviewing your management plan.',
  }
}

export interface InsightDelta {
  avgWith: number | null
  avgWithout: number | null
  delta: number | null // avgWithout - avgWith (positive = preventer days better)
  sentence: string
}

/**
 * "Symptoms on preventer days vs not" — the delta in average symptom rating.
 * Positive delta means symptoms were lower on days with a preventer dose.
 */
export function whatHelpedDelta(
  checkins: BreatheCheckin[],
  doseLogs: BreatheDoseLog[],
  meds: BreatheMed[],
): InsightDelta {
  if (checkins.length < 2) {
    return {
      avgWith: null,
      avgWithout: null,
      delta: null,
      sentence: 'Add a few check-ins to see what helps.',
    }
  }

  const preventerIds = new Set(
    meds.filter((m) => m.medType === 'controller').map((m) => m.id),
  )
  const preventerDays = new Set(
    doseLogs.filter((d) => preventerIds.has(d.medId)).map((d) => d.date),
  )

  const withVals: number[] = []
  const withoutVals: number[] = []
  for (const c of checkins) {
    if (c.symptoms == null) continue
    if (preventerDays.has(c.date)) withVals.push(c.symptoms)
    else withoutVals.push(c.symptoms)
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  const avgWith = avg(withVals)
  const avgWithout = avg(withoutVals)

  if (avgWith == null || avgWithout == null) {
    return {
      avgWith,
      avgWithout,
      delta: null,
      sentence: 'Compare days with and without your preventer to find what helps.',
    }
  }

  const delta = Math.round((avgWithout - avgWith) * 10) / 10
  const abs = Math.abs(delta)

  let sentence: string
  if (delta > 0.25) {
    sentence = `Symptoms were ${abs.toFixed(1)} points lower on days you took your preventer.`
  } else if (delta < -0.25) {
    sentence = `Symptoms were ${abs.toFixed(1)} points higher on preventer days.`
  } else {
    sentence = 'No clear difference between days with and without your preventer yet.'
  }

  return { avgWith, avgWithout, delta, sentence }
}

/** Spearman rank correlation between two arrays of paired numbers (None if <2 pairs). */
export function spearman(a: number[], b: number[]): number | null {
  const pairs = a
    .map((av, i) => [av, b[i]] as const)
    .filter(([x, y]) => x != null && y != null)

  if (pairs.length < 2) return null

  const rank = (xs: number[]) => {
    const sorted = [...xs].sort((x, y) => x - y)
    return xs.map((v) => {
      const first = sorted.indexOf(v)
      const last = sorted.lastIndexOf(v)
      return (first + 1 + last + 1) / 2 // ties take the average rank
    })
  }

  const ra = rank(pairs.map((p) => p[0]))
  const rb = rank(pairs.map((p) => p[1]))
  const n = ra.length

  const da = ra.map((v, i) => v - rb[i])
  const d2 = da.reduce((s, d) => s + d * d, 0)
  const denom = n * (n * n - 1)
  if (denom === 0) return null

  const rho = 1 - (6 * d2) / denom
  return Math.round(rho * 100) / 100
}

export function spearmanStrength(rho: number): 'strong' | 'moderate' | 'weak' {
  const v = Math.abs(rho)
  if (v >= 0.6) return 'strong'
  if (v >= 0.3) return 'moderate'
  return 'weak'
}

export interface CorrelationCell {
  a: string
  b: string
  rho: number | null
}

/** Pairwise correlations across check-in numeric fields. */
export function correlations(checkins: BreatheCheckin[]): CorrelationCell[] {
  const fields: { key: 'symptoms' | 'sleep' | 'activity' | 'peakFlow'; label: string }[] = [
    { key: 'symptoms', label: 'Symptoms' },
    { key: 'sleep', label: 'Sleep' },
    { key: 'activity', label: 'Activity' },
    { key: 'peakFlow', label: 'Peak flow' },
  ]

  const cells: CorrelationCell[] = []
  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const a = fields[i]
      const b = fields[j]
      const as: number[] = []
      const bs: number[] = []
      for (const c of checkins) {
        if (c[a.key] != null && c[b.key] != null) {
          as.push(c[a.key] as number)
          bs.push(c[b.key] as number)
        }
      }
      const rho = spearman(as, bs)
      cells.push({
        a: `${a.label} ↔ ${b.label}`,
        b: '',
        rho: rho == null ? null : rho,
      })
    }
  }
  return cells
}