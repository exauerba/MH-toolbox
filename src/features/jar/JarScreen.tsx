import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  SegmentedControl,
  Stepper,
  TextInput,
  cx,
} from '../../design'
import type { IconName } from '../../design'
import { useRepository } from '../../data/RepositoryProvider'
import { fromISODate, todayForResetHour, toISODate } from '../../shared/day'
import type { JarLog } from '../../data/types'
import { STATE_META } from './jarStates'
import type { JarState } from './jarStates'

/**
 * The Energy Jar. The jar is a literal vessel: liquid rises and falls with
 * your remaining spoons, and each spoon sits in the jar. The three states
 * are always conveyed by icon + label + copy, never colour alone.
 */

function formatAmount(amount: number): string {
  return amount % 1 === 0 ? String(amount) : amount.toFixed(1)
}

interface LeaveBurst {
  id: number
  count: number
}

interface JarVesselProps {
  total: number
  remaining: number
  borrowed: number
  fill: 'spoons' | 'chips'
  leaving: LeaveBurst[]
}

/**
 * The jar itself. Decorative (aria-hidden) — the counts live in the
 * labelled ledger below. Liquid animates with transform only; the global
 * reduced-motion kill-switch collapses both to an instant swap.
 */
function JarVessel({ total, remaining, borrowed, fill, leaving }: JarVesselProps) {
  const ratio = total > 0 ? remaining / total : 0
  const spoons = Array.from({ length: remaining }, (_, i) => i)

  return (
    <div aria-hidden="true" className="relative mx-auto w-36 pt-2 sm:w-[10.5rem]">
      {/* Lid — pixel jar, hard stepped walnut */}
      <div className="mx-auto h-3 w-20 rounded-t-sm border-[3px] border-b-0 border-walnut-600 bg-walnut-500 sm:w-24" />
      {/* Neck */}
      <div className="mx-auto h-4 w-24 rounded-none border-[3px] border-b-0 border-walnut-600 bg-parchment sm:w-28" />
      {/* Body */}
      <div className="relative mx-auto h-44 w-32 overflow-hidden rounded-t-sm rounded-b-[6px] border-[3px] border-walnut-600 bg-parchment shadow-pixel sm:h-56 sm:w-36">
        {/* Liquid — fills from the bottom, animates on spend */}
        <div
          className="absolute inset-x-0 bottom-0 h-full origin-bottom rounded-none bg-jar-300 transition-transform duration-[var(--dur-jar)] ease-[var(--ease-out)]"
          style={{ transform: `scaleY(${ratio})` }}
        />
        {/* A calmer liquid band so the fill reads as depth, not flat colour */}
        <div
          className="absolute inset-x-0 bottom-0 h-full origin-bottom rounded-none bg-jar-400/25 transition-transform duration-[var(--dur-jar)] ease-[var(--ease-out)]"
          style={{ transform: `scaleY(${Math.max(0, ratio - 0.08)})` }}
        />
        {/* Retro liquid surface line — a crisp 3px edge at the fill top */}
        {ratio > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 h-[3px] bg-jar-500 transition-[bottom] duration-[var(--dur-jar)] ease-[var(--ease-out)]"
            style={{ bottom: `calc(${ratio * 100}% - 3px)` }}
          />
        )}
        {/* Spoons sitting in the liquid */}
        {remaining > 0 && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col-reverse items-center justify-end gap-1 pb-2">
            {spoons.map((i) => (
              <Icon
                key={i}
                name={fill === 'chips' ? 'chip' : 'spoon'}
                size={13}
                pixel
                className="animate-chip-pour text-jar-800"
              />
            ))}
          </div>
        )}
        {/* Bursts leaving the jar mouth — fly up past the lid, then fade */}
        {leaving.map((burst) => (
          <div
            key={burst.id}
            className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-center gap-1 pt-1"
          >
            {Array.from({ length: burst.count }, (_, i) => (
              <Icon
                key={`${burst.id}-${i}`}
                name={fill === 'chips' ? 'chip' : 'spoon'}
                size={13}
                pixel
                className="animate-chip-leave text-jar-800"
              />
            ))}
          </div>
        ))}
        {/* Borrowed spills out the top edge */}
        {borrowed > 0 && (
          <div className="absolute inset-x-0 top-0 flex flex-wrap items-start justify-center gap-1 pt-1">
            {Array.from({ length: borrowed }, (_, i) => (
              <Icon
                key={i}
                name="plus"
                size={13}
                pixel
                className="animate-chip-pour text-overdrawn-strong"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function LedgerStat({
  icon,
  value,
  label,
  tone,
  live,
}: {
  icon: IconName
  value: number
  label: string
  tone: string
  live?: boolean
}) {
  return (
    <span
      className={cx(
        'pixel-chip flex min-h-11 items-center gap-2 border px-4 py-1.5 text-sm font-bold',
        tone,
      )}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
    >
      <Icon name={icon} size={16} pixel />
      <span className="font-extrabold tabular-nums">{value}</span>
      <span className="font-semibold">{label}</span>
    </span>
  )
}

interface EditState {
  id: string
  spent: number
  label: string
}

export function JarScreen() {
  const repo = useRepository()
  const navigate = useNavigate()

  const [ready, setReady] = useState(false)
  const [resetHour, setResetHour] = useState(0)
  const [dayTotal, setDayTotal] = useState(12)
  const [logs, setLogs] = useState<JarLog[]>([])
  const [step, setStep] = useState(0.5)
  const [labelText, setLabelText] = useState('')
  const [fill, setFill] = useState<'spoons' | 'chips'>('spoons')
  const [leaving, setLeaving] = useState<LeaveBurst[]>([])
  const [buttonBurst, setButtonBurst] = useState<LeaveBurst | null>(null)
  const nextLeaveId = useRef(1)
  const [editing, setEditing] = useState<EditState | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const profile = await repo.getProfile()
      if (cancelled) return
      const hour = profile?.jarResetHour ?? 0
      const spoons = profile?.jarDefaultSpoons ?? 12
      const today = todayForResetHour(hour)
      const [day, allLogs] = await Promise.all([
        repo.getJarDay(today),
        repo.listJarLogs(),
      ])
      if (cancelled) return
      setResetHour(hour)
      setDayTotal(day?.totalSpoons ?? spoons)
      setLogs(allLogs)
      setReady(true)
    }
    void load().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [repo])

  const today = todayForResetHour(resetHour)
  const todayLogs = logs
    .filter((log) => log.date === today)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const spent = todayLogs.reduce((sum, log) => sum + log.spent, 0)
  const remaining = Math.max(0, dayTotal - spent)
  const borrowed = Math.max(0, spent - dayTotal)
  const state: JarState = borrowed > 0 ? 'overdrawn' : remaining <= 3 ? 'low' : 'healthy'
  const meta = STATE_META[state]

  const spentByDate = new Map<string, number>()
  const spentByLabel = new Map<string, number>()
  for (const log of logs) {
    spentByDate.set(log.date, (spentByDate.get(log.date) ?? 0) + log.spent)
    const key = log.label ?? 'No label'
    spentByLabel.set(key, (spentByLabel.get(key) ?? 0) + log.spent)
  }
  const history = Array.from({ length: 7 }, (_, i) => {
    const d = fromISODate(today)
    d.setDate(d.getDate() - (6 - i))
    const iso = toISODate(d)
    return {
      iso,
      day: d.toLocaleDateString(undefined, { weekday: 'short' }),
      value: spentByDate.get(iso) ?? 0,
    }
  })
  const maxHistory = Math.max(1, ...history.map((h) => h.value))
  const patterns = [...spentByLabel.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
  const maxPattern = Math.max(1, ...patterns.map((p) => p.value))

  const refreshLogs = async () => {
    const allLogs = await repo.listJarLogs()
    setLogs(allLogs)
  }

  const addSpoon = async () => {
    const label = labelText.trim() || null
    await repo.addJarLog({ date: today, spent: step, label })
    setLabelText('')
    const burst = { id: nextLeaveId.current++, count: Math.max(1, Math.ceil(step)) }
    setLeaving((cur) => [...cur, burst])
    setButtonBurst(burst)
    setTimeout(() => setLeaving((cur) => cur.filter((b) => b.id !== burst.id)), 550)
    setTimeout(() => setButtonBurst((cur) => (cur?.id === burst.id ? null : cur)), 550)
    await refreshLogs()
  }

  const startEdit = (log: JarLog) => {
    setEditing({ id: log.id, spent: log.spent, label: log.label ?? '' })
  }

  const saveEdit = async () => {
    if (!editing) return
    await repo.updateJarLog(editing.id, {
      date: today,
      spent: editing.spent,
      label: editing.label.trim() || null,
    })
    setEditing(null)
    await refreshLogs()
  }

  const deleteLog = async (id: string) => {
    await repo.deleteJarLog(id)
    await refreshLogs()
  }

  const header = (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton
        icon="arrowLeft"
        label="Back to home"
        variant="ghost"
        onClick={() => navigate('/')}
      />
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="pixel-tile flex size-10 items-center justify-center rounded-none bg-jar-100 text-jar-700 dark:bg-jar-300/20 dark:text-jar-300"
        >
          <Icon name="jar" size={22} pixel />
        </span>
        <h1 className="font-display text-xl font-bold text-ink">Energy Jar</h1>
      </div>
    </div>
  )

  if (!ready) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card variant="raised" padding="lg" className="pixel-card flex-1">
          <p className="text-sm text-ink-soft">Loading…</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      <Card variant="raised" padding="lg" className="pixel-card flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Today's jar</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {resetHour === 0 ? 'Reset at midnight' : `Resets at ${resetHour}:00`} ·{' '}
              {dayTotal} spoons today
            </p>
          </div>
          <SegmentedControl
            label="Jar contents"
            value={fill}
            onChange={(value) => setFill(value as 'spoons' | 'chips')}
            className="max-w-56"
            options={[
              { value: 'spoons', label: 'Spoons', icon: 'spoon' },
              { value: 'chips', label: 'Chips', icon: 'chip' },
            ]}
            pixel
          />
        </div>

        {/* State banner — icon + label + copy, never colour alone */}
        <div
          className={cx(
            'mt-5 flex items-start gap-3 rounded-none border-2 p-4',
            state === 'overdrawn' && 'border-overdrawn-line bg-overdrawn-soft text-overdrawn-ink',
            state === 'low' && 'border-low-line bg-low-soft text-low-ink',
            state === 'healthy' && 'border-jar-200 bg-jar-50 text-jar-800',
          )}
        >
          <Chip
            tone={state === 'healthy' ? 'jar' : state === 'low' ? 'low' : 'overdrawn'}
            icon={<Icon name={meta.icon} size={15} pixel />}
          >
            {meta.label}
          </Chip>
          <p role="status" className="text-base leading-relaxed">
            {meta.copy}
          </p>
        </div>

        {/* Jar + quick-add — two columns on desktop; on mobile the jar and
            the logging form sit together so you can log while watching the jar.
            Today's log spans full width below so neither column gaps. */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* The jar — self-start keeps it compact instead of stretching to
              the right column's height */}
          <div className="min-w-0 self-start rounded-none border-2 border-line-strong bg-surface px-4 py-4 shadow-pixel-sm sm:py-8">
            <JarVessel
              total={dayTotal}
              remaining={remaining}
              borrowed={borrowed}
              fill={fill}
              leaving={leaving}
            />
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:mt-5">
              <LedgerStat
                icon={fill === 'chips' ? 'chip' : 'spoon'}
                value={remaining}
                label="left"
                tone="border-jar-200 bg-jar-50 text-jar-800"
                live
              />
              <LedgerStat
                icon="close"
                value={spent}
                label="spent"
                tone="border-line bg-surface text-ink-soft"
              />
              {borrowed > 0 && (
                <LedgerStat
                  icon="plus"
                  value={borrowed}
                  label="borrowed"
                  tone="border-overdrawn-line bg-overdrawn-soft text-overdrawn-ink"
                />
              )}
            </div>
            {borrowed > 0 && (
              <p className="mt-3 text-center text-sm font-semibold text-overdrawn-ink">
                {borrowed} borrowed from tomorrow — every jar starts fresh.
              </p>
            )}
          </div>

          {/* Quick add — a card that matches the jar's height on desktop so the
              row stays balanced; on mobile it flows right under the jar */}
          <div className="flex min-w-0 flex-col rounded-none border-2 border-line p-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">
              Log a spoonful
            </h3>
            <p className="mb-3 mt-1 text-sm text-ink-soft">
              Takes about ten seconds — that's the point.
            </p>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3 lg:flex lg:flex-wrap">
              <Stepper
                label="Spoons spent"
                value={step}
                onChange={setStep}
                step={0.5}
                min={0.5}
                max={5}
                pixel
              />
              <div className="relative justify-self-end">
                <Button
                  onClick={addSpoon}
                  className="pixel-btn"
                  leadingIcon={<Icon name="plus" size={18} pixel />}
                >
                  Log {formatAmount(step)}
                </Button>
                {buttonBurst && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-1 left-1/2 flex -translate-x-1/2 -translate-y-full items-start gap-1"
                  >
                    {Array.from({ length: buttonBurst.count }, (_, i) => (
                      <Icon
                        key={i}
                        name={fill === 'chips' ? 'chip' : 'spoon'}
                        size={13}
                        pixel
                        className="animate-chip-leave text-jar-800"
                      />
                    ))}
                  </span>
                )}
              </div>
              <TextInput
                label="Label (optional)"
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                placeholder="e.g. shower, work call"
                maxLength={40}
                className="col-span-2 min-w-52 flex-1 lg:col-span-1"
              />
            </div>
            <p className="mt-auto pt-2 text-sm text-ink-soft">
              Optional label — e.g. "shower", "work call", "social event" (≤40 chars, used
              for your pattern view).
            </p>
          </div>

          {/* Today's log — full width below so the left column doesn't gap */}
          <div className="min-w-0 rounded-none border-2 border-line p-4 lg:col-span-2">
            <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
              Today's log
            </h3>
            {todayLogs.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {todayLogs.map((log) =>
                  editing?.id === log.id ? (
                    <li
                      key={log.id}
                      className="flex flex-col gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2"
                    >
                      <Stepper
                        label="Spoons spent"
                        value={editing.spent}
                        onChange={(value) => setEditing({ ...editing, spent: value })}
                        step={0.5}
                        min={0.5}
                        max={5}
                        pixel
                      />
                      <TextInput
                        label="Label"
                        value={editing.label}
                        onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                        maxLength={40}
                        placeholder="No label"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          onClick={saveEdit}
                          className="min-h-9 px-4 text-sm"
                          leadingIcon={<Icon name="check" size={16} pixel />}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditing(null)}
                          className="min-h-9 px-4 text-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </li>
                  ) : (
                    <li
                      key={log.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted px-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-ink">
                        <Icon
                          name="spoon"
                          size={16}
                          pixel
                          className="shrink-0 text-jar-600"
                        />
                        <span className="truncate">{log.label ?? 'No label'}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums text-ink-soft">
                        {formatAmount(log.spent)} spoons
                        <IconButton
                          icon="edit"
                          label={`Edit "${log.label ?? 'untitled'}"`}
                          variant="ghost"
                          pixel
                          onClick={() => startEdit(log)}
                        />
                        <IconButton
                          icon="trash"
                          label={`Delete "${log.label ?? 'untitled'}"`}
                          variant="ghost"
                          pixel
                          onClick={() => deleteLog(log.id)}
                        />
                      </span>
                    </li>
                  ),
                )}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">
                Nothing logged yet today. The jar stays full until you spend.
              </p>
            )}
          </div>
        </div>

        {/* History + patterns */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
              Last 7 days
            </h3>
            <div className="flex items-end justify-between gap-2" aria-hidden="true">
              {history.map((day) => (
                <div key={day.iso} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-bold tabular-nums text-ink-soft">
                    {day.value}
                  </span>
                  <span
                    className="w-full rounded-t-none border-2 border-b-0 border-jar-200 bg-jar-300"
                    style={{ height: `${(day.value / maxHistory) * 56}px` }}
                  />
                  <span className="text-xs font-bold text-ink-soft">{day.day}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
              Where your spoons went
            </h3>
            <div className="flex flex-col gap-2">
              {patterns.map((pattern) => (
                <div key={pattern.label} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate font-semibold text-ink-soft">
                    {pattern.label}
                  </span>
                  <span className="h-3 flex-1 overflow-hidden rounded-none border border-line bg-surface-strong">
                    <span
                      className="block h-full rounded-none bg-jar-400"
                      style={{ width: `${(pattern.value / maxPattern) * 100}%` }}
                    />
                  </span>
                  <span className="w-6 text-right font-bold tabular-nums text-ink">
                    {pattern.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}