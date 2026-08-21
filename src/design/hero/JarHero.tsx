import { useRef, useState } from 'react'
import { Button, Card, Chip, IconButton, SegmentedControl, Stepper } from '../primitives'
import { Icon } from '../icons'
import { SpecPanel } from './SpecPanel'
import { cx } from '../cx'
import { STATE_META } from '../../features/jar/jarStates'
import type { JarState } from '../../features/jar/jarStates'
import { LOW_SPOON_THRESHOLD } from '../../features/jar/constants'

const PRESETS: Record<JarState, { total: number; spent: number }> = {
  healthy: { total: 12, spent: 3 },
  low: { total: 12, spent: 10 },
  overdrawn: { total: 12, spent: 15 },
}

const HISTORY = [  { day: 'Mon', value: 11 },
  { day: 'Tue', value: 9 },
  { day: 'Wed', value: 12 },
  { day: 'Thu', value: 8 },
  { day: 'Fri', value: 12 },
  { day: 'Sat', value: 7 },
  { day: 'Sun', value: 4 },
]

const PATTERNS = [
  { label: 'Social events', value: 18 },
  { label: 'Shower & hygiene', value: 14 },
  { label: 'Work calls', value: 12 },
  { label: 'Walks', value: 6 },
]

/**
 * ENERGY JAR — live hero visual + spec.
 * A chip tray metaphor: available chips sit in the jar, spent chips drop to
 * the spent tray. Three states (healthy / low / overdrawn) with kind,
 * non-shaming copy; a 0.5-step quick-add; history + pattern view.
 */
export function JarHero() {
  const [preset, setPreset] = useState<JarState>('healthy')
  const [total, setTotal] = useState(PRESETS.healthy.total)
  const [spent, setSpent] = useState(PRESETS.healthy.spent)
  const [step, setStep] = useState(0.5)
  const [logs, setLogs] = useState<{ id: number; amount: number; label?: string }[]>([
    { id: 1, amount: 2, label: 'Morning shower' },
    { id: 2, amount: 1, label: 'Work call' },
  ])
  const nextIdRef = useRef(3)

  const remaining = Math.max(0, total - spent)
  const borrowed = Math.max(0, spent - total)
  const state: JarState = borrowed > 0 ? 'overdrawn' : remaining <= LOW_SPOON_THRESHOLD ? 'low' : 'healthy'
  const meta = STATE_META[state]

  const applyPreset = (next: JarState) => {
    setPreset(next)
    const p = PRESETS[next]
    setTotal(p.total)
    setSpent(p.spent)
  }

  const logSpoon = () => {
    const id = nextIdRef.current++
    setSpent((s) => s + step)
    setLogs((l) => [...l, { id, amount: step }])
  }

  const chips = Array.from({ length: total }, (_, i) => {
    if (i < spent) return 'spent'
    return 'available'
  })

  const maxHistory = Math.max(...HISTORY.map((h) => h.value))
  const maxPattern = Math.max(...PATTERNS.map((p) => p.value))

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card variant="raised" padding="lg" className="pixel-card flex-1">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display flex items-center gap-2 text-xl font-bold text-ink">
              <span className="pixel-tile flex size-10 items-center justify-center rounded-none bg-jar-100 text-jar-700 dark:bg-jar-300/20 dark:text-jar-300">
                <Icon name="spoon" size={22} pixel />
              </span>
              Today's jar
            </h3>
            <p className="mt-1 text-sm text-ink-soft">Reset at midnight · {total} spoons today</p>
          </div>
          <SegmentedControl
            label="Demo jar state"
            value={preset}
            onChange={(v) => applyPreset(v as JarState)}
            options={[
              { value: 'healthy', label: 'Healthy' },
              { value: 'low', label: 'Low' },
              { value: 'overdrawn', label: 'Overdrawn' },
            ]}
            className="max-w-64"
            pixel
          />
        </div>

        {/* State banner — never colour-alone: chip icon + label + copy */}
        <div
          className={cx(
            'flex items-start gap-3 rounded-xl border p-4',
            state === 'overdrawn' && 'border-overdrawn-line bg-overdrawn-soft text-overdrawn-ink',
            state === 'low' && 'border-low-line bg-low-soft text-low-ink',
            state === 'healthy' && 'border-jar-200 bg-jar-50 text-jar-800',
          )}
        >
          <Chip tone={state === 'healthy' ? 'jar' : state === 'low' ? 'low' : 'overdrawn'} icon={<Icon name={meta.icon} size={15} pixel />}>
            {meta.label}
          </Chip>
          <p className="text-base leading-relaxed" role="status">
            {meta.copy}
          </p>
        </div>

        {/* Chip trays */}
        <div className="mt-5 rounded-xl border border-line bg-surface-muted p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">In the jar</p>
            <p className="text-sm font-extrabold tabular-nums text-ink">{remaining} left</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-hidden="true">
            {chips.map((kind, i) => (
              <span
                key={i}
                className={cx(
                  'flex size-9 items-center justify-center rounded-full border-2',
                  kind === 'available' && 'border-jar-400 bg-jar-300 text-jar-800',
                  kind === 'spent' && 'border-line bg-surface text-ink-soft',
                )}
              >
                {kind === 'spent' && <Icon name="close" size={14} pixel />}
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <p className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">Spent</p>
            <p className="text-sm font-extrabold tabular-nums text-ink" aria-live="polite">
              {spent} of {total} used
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-2" aria-hidden="true">
            {Array.from({ length: spent }).map((_, i) => (
              <span
                key={i}
                className="flex size-9 items-center justify-center rounded-full border-2 border-overdrawn-line bg-overdrawn-soft text-overdrawn-ink animate-chip-pour"
              >
                <Icon name={i < total ? 'check' : 'plus'} size={14} pixel />
              </span>
            ))}
          </div>
          {borrowed > 0 && (
            <p className="mt-2 text-sm font-semibold text-overdrawn-ink">
              {borrowed} borrowed from tomorrow — every jar starts fresh.
            </p>
          )}
        </div>

        {/* Quick-add */}
        <div className="mt-5">
          <p className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">Log a spoonful</p>
          <p className="mb-2 text-sm text-ink-soft">Takes about ten seconds — that's the point.</p>
          <div className="flex flex-wrap items-end gap-3">
            <Stepper label="Spoons spent" value={step} onChange={setStep} step={0.5} min={0.5} max={5} pixel />
            <Button onClick={logSpoon} className="pixel-btn" leadingIcon={<Icon name="plus" size={18} pixel />}>
              Log {step % 1 === 0 ? step : step.toFixed(1)}
            </Button>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Optional label — e.g. “shower”, “work call”, “social event” (≤40 chars, used for your pattern view).
          </p>
        </div>

        {/* Today's log */}
        <div className="mt-5 rounded-xl border border-line p-4">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Today's log</p>
          <ul className="flex flex-col gap-2">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2">
                <span className="flex items-center gap-2 text-ink">
                  <Icon name="spoon" size={16} pixel className="text-jar-600" />
                  {log.label ?? 'No label'}
                </span>
                <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-ink-soft">
                  {log.amount % 1 === 0 ? log.amount : log.amount.toFixed(1)} spoons
                  <IconButton icon="trash" label={`Delete “${log.label ?? 'untitled'}”`} variant="ghost" pixel />
                  <IconButton icon="edit" label={`Edit “${log.label ?? 'untitled'}”`} variant="ghost" pixel />
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* History + patterns */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Last 7 days</p>
            <div className="flex items-end justify-between gap-2" aria-hidden="true">
              {HISTORY.map((day) => (
                <div key={day.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-bold tabular-nums text-ink-soft">{day.value}</span>
                  <span
                    className="w-full rounded-t-[var(--radius-pixel)] border-2 border-b-0 border-jar-200 bg-jar-300"
                    style={{ height: `${(day.value / maxHistory) * 56}px` }}
                  />
                  <span className="text-xs font-bold text-ink-soft">{day.day}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">Where your spoons went</p>
            <div className="flex flex-col gap-2">
              {PATTERNS.map((p) => (
                <div key={p.label} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate font-semibold text-ink-soft">{p.label}</span>
                  <span className="h-3 flex-1 overflow-hidden rounded-none border border-line bg-surface-strong">
                    <span
                      className="block h-full rounded-none bg-jar-400"
                      style={{ width: `${(p.value / maxPattern) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right font-bold tabular-nums text-ink">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <SpecPanel
        owner="WP6 · Energy Jar"
        title="Energy Jar hero visual"
        className="lg:w-80 xl:w-96"
        sections={[
          {
            heading: 'Structure',
            items: [
              <span key="s1">
                <strong>JarView</strong> (Card raised) → <strong>StateBanner</strong> + <strong>ChipTray</strong>
                (available) + <strong>ChipTray</strong> (spent) + <strong>QuickAdd</strong> + <strong>LogList</strong> +
                <strong> History</strong>.
              </span>,
              <span key="s2">
                Available tray renders one circle per spoon up to <code>total</code>; spent tray renders one per{' '}
                <code>spent</code>.
              </span>,
            ],
          },
          {
            heading: 'Tokens',
            items: [
              <span key="t1">Jar accent: <code>jar-*</code> ramp (honey).</span>,
              <span key="t2">
                States: <code>healthy</code>=success family, <code>low</code>=warning family,{' '}
                <code>overdrawn</code>=overdrawn family (ink/soft/line/strong).
              </span>,
              <span key="t3">
                Chip patterns — never colour-alone: available = filled, spent = <Icon name="close" size={13} /> slash,
                borrowed = <Icon name="plus" size={13} /> in clay.
              </span>,
            ],
          },
          {
            heading: 'States & copy (verbatim)',
            items: [
              <span key="c1">healthy → “Plenty left today. Rest when you need it — your spoons are yours.”</span>,
              <span key="c2">
                low → “Running low is okay. Maybe pick the one thing that matters most, and let the rest wait.”
              </span>,
              <span key="c3">
                overdrawn → “You've used more than today's jar. That's information, not failure — tomorrow starts
                fresh.”
              </span>,
              <span key="c4">
                Every state chip leads with an icon + label; the message line is <code>role="status"</code>.
              </span>,
            ],
          },
          {
            heading: 'Quick-add',
            items: [
              <span key="q1">
                Stepper at <code>0.5</code> steps (min 0.5, max 5) + optional label (≤40 chars) + one-tap “Log” — a
                bare-minimum log must stay under 10 seconds.
              </span>,
              <span key="q2">
                Spent total announces via <code>aria-live</code>: “4 of 12 used”. Stepper buttons label their new value.
              </span>,
            ],
          },
          {
            heading: 'Reduced motion',
            items: [
              <span key="r1">
                Default: a spent chip pours <code>translateY(-14px)</code> + fade in <code>var(--dur-jar)</code> with{' '}
                <code>var(--ease-spring)</code>.
              </span>,
              <span key="r2">
                Reduced-motion: the global kill-switch collapses the pour to an instant — chips simply appear. No state
                machine runs; the copy and patterns are identical.
              </span>,
            ],
          },
        ]}
      />
    </div>
  )
}
