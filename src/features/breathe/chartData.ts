import type { BreatheCheckin, BreatheDoseLog, BreatheMed } from '../../data/types'
import { normalBandPlugin, rawDotsPlugin } from '../../design/charts/chartPlugins'
import type { ChartConfiguration, TooltipItem } from 'chart.js'

export interface TrendPoint {
  date: string
  symptoms: number | null
  peakFlow: number | null
}

export interface TimeOfDayBucket {
  label: string
  hours: [number, number]
}

export const TIME_OF_DAY_BUCKETS: TimeOfDayBucket[] = [
  { label: 'Morning', hours: [5, 11] },
  { label: 'Afternoon', hours: [12, 16] },
  { label: 'Evening', hours: [17, 21] },
  { label: 'Night', hours: [22, 4] },
]

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Last `n` calendar dates ending today, oldest first (YYYY-MM-DD). */
export function lastNDates(n: number, now = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    out.push(localDate(d))
  }
  return out
}

function localDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  return DAY_NAMES[d.getDay()]
}

/** Build the trend-chart config for one window of check-ins. */
export function buildTrendConfig(
  checkins: BreatheCheckin[],
  dates: string[],
): ChartConfiguration<'line'> {
  const byDate = new Map(checkins.map((c) => [c.date, c]))

  const symptoms = dates.map((date) => byDate.get(date)?.symptoms ?? null)
  const peakFlow = dates.map((date) => byDate.get(date)?.peakFlow ?? null)

  // Rolling 3-day mean of symptoms for a smooth line over the raw points.
  const rolling = symptoms.map((_, i) => {
    const window = symptoms.slice(Math.max(0, i - 2), i + 1).filter((x): x is number => x != null)
    if (window.length === 0) return null
    return Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) / 10
  })

  const labels = dates.map(dayLabel)

  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Symptoms (rolling mean)',
          data: rolling,
          borderColor: 'rgba(125, 76, 255, 1)', // breathe-700
          backgroundColor: 'rgba(125, 76, 255, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          yAxisID: 'y',
        },
        {
          label: 'Raw symptom reading',
          data: symptoms,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointBackgroundColor: 'rgba(125, 76, 255, 0.5)',
          pointRadius: 3,
          showLine: false,
          yAxisID: 'y',
        },
        {
          label: 'Peak flow (L/min)',
          data: peakFlow,
          borderColor: 'rgba(157, 120, 255, 1)', // breathe-600
          backgroundColor: 'rgba(157, 120, 255, 0.1)',
          tension: 0.3,
          pointRadius: 0,
          yAxisID: 'y1',
        },
      ],
    },
    plugins: [
      (normalBandPlugin as never),
      (rawDotsPlugin as never),
    ],
    options: {
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 5,
          title: { display: true, text: 'Symptom severity (1–5)' },
        },
        y1: {
          position: 'right',
          grid: { drawOnChartArea: false },
          beginAtZero: true,
          title: { display: true, text: 'L/min' },
        },
      },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const idx = items[0]?.dataIndex ?? 0
              return `${labels[idx] ?? ''} · ${dates[idx] ?? ''}`
            },
          },
        },
      },
    },
  } as unknown as ChartConfiguration<'line'>
}

/** Bucket dose logs into Morning/Afternoon/Evening/Night. */
export function buildTimeOfDayConfig(
  doseLogs: BreatheDoseLog[],
): ChartConfiguration<'bar'> {
  const counts = TIME_OF_DAY_BUCKETS.map((bucket) => {
    const [start, end] = bucket.hours
    return doseLogs.filter((log) => {
      if (!log.time) return false
      const [h] = log.time.split(':').map(Number)
      if (Number.isNaN(h)) return false
      if (start <= end) return h >= start && h <= end
      // Overnight bucket (e.g. Night 22–4) wraps past midnight.
      return h >= start || h <= end
    }).length
  })

  return {
    type: 'bar',
    data: {
      labels: TIME_OF_DAY_BUCKETS.map((b) => b.label),
      datasets: [
        {
          label: 'Doses',
          data: counts,
          backgroundColor: 'rgba(125, 76, 255, 0.7)', // breathe-700
          borderRadius: 4,
        },
      ],
    },
    options: {
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<'bar'>[]) => `Doses · ${items[0]?.label ?? ''}`,
            afterBody: () =>
              doseLogs.length > 0
                ? 'Only logged doses are counted here.'
                : 'No dose logs in this window yet.',
          },
        },
      },
    },
  } as unknown as ChartConfiguration<'bar'>
}

/** Days with >= 1 dose log, per med (for adherence-ish bars). */
export function medDoseCountsByDay(
  meds: BreatheMed[],
  doseLogs: BreatheDoseLog[],
  dates: string[],
): Record<string, number[]> {
  const medIds = meds.map((m) => m.id)
  const counts = medIds.map(() => dates.map(() => 0))
  for (const log of doseLogs) {
    const medIdx = medIds.indexOf(log.medId)
    if (medIdx < 0) continue
    const dayIdx = dates.indexOf(log.date)
    if (dayIdx < 0) continue
    counts[medIdx][dayIdx] += 1
  }
  return Object.fromEntries(meds.map((m, i) => [m.id, counts[i]]))
}