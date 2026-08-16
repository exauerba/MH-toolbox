import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Chip,
  Icon,
  IconButton,
  SegmentedControl,
  Stepper,
  cx,
} from '../../design';
import type { IconName } from '../../design';

/**
 * The Energy Jar preview. The jar is a literal vessel: liquid rises and
 * falls with your remaining spoons, and each spoon sits in the jar. The
 * three states are always conveyed by icon + label + copy, never colour
 * alone. Preview data only — the real feature replaces this in WP6.
 */

type JarState = 'healthy' | 'low' | 'overdrawn';

interface StateMeta {
  label: string;
  icon: IconName;
  copy: string;
}

const STATE_META: Record<JarState, StateMeta> = {
  healthy: {
    label: 'Plenty left',
    icon: 'check',
    copy: 'Plenty left today. Rest when you need it — your spoons are yours.',
  },
  low: {
    label: 'Running low',
    icon: 'gauge',
    copy: 'Running low is okay. Maybe pick the one thing that matters most, and let the rest wait.',
  },
  overdrawn: {
    label: 'Borrowed from tomorrow',
    icon: 'heart',
    copy: "You've used more than today's jar. That's information, not failure — tomorrow starts fresh.",
  },
};

const PRESETS: Record<JarState, { total: number; spent: number }> = {
  healthy: { total: 12, spent: 3 },
  low: { total: 12, spent: 10 },
  overdrawn: { total: 12, spent: 15 },
};

const HISTORY = [
  { day: 'Mon', value: 11 },
  { day: 'Tue', value: 9 },
  { day: 'Wed', value: 12 },
  { day: 'Thu', value: 8 },
  { day: 'Fri', value: 12 },
  { day: 'Sat', value: 7 },
  { day: 'Sun', value: 4 },
];

const PATTERNS = [
  { label: 'Social events', value: 18 },
  { label: 'Shower & hygiene', value: 14 },
  { label: 'Work calls', value: 12 },
  { label: 'Walks', value: 6 },
];

interface Log {
  id: number;
  amount: number;
  label?: string;
}

function formatAmount(amount: number): string {
  return amount % 1 === 0 ? String(amount) : amount.toFixed(1);
}

interface JarVesselProps {
  total: number;
  remaining: number;
  borrowed: number;
}

/**
 * The jar itself. Decorative (aria-hidden) — the counts live in the
 * labelled ledger below. Liquid animates with transform only; the global
 * reduced-motion kill-switch collapses both to an instant swap.
 */
function JarVessel({ total, remaining, borrowed }: JarVesselProps) {
  const ratio = total > 0 ? remaining / total : 0;
  const spoons = Array.from({ length: remaining }, (_, i) => i);

  return (
    <div
      aria-hidden="true"
      className="mx-auto w-fit pt-2"
      style={{ width: '10.5rem' }}
    >
      {/* Lid — pixel jar, hard stepped walnut */}
      <div className="mx-auto h-3 w-24 rounded-t-sm border-[3px] border-b-0 border-walnut-600 bg-walnut-500" />
      {/* Neck */}
      <div className="mx-auto h-4 w-28 rounded-none border-[3px] border-b-0 border-walnut-600 bg-parchment" />
      {/* Body */}
      <div className="relative mx-auto h-56 w-36 overflow-hidden rounded-t-sm rounded-b-[6px] border-[3px] border-walnut-600 bg-parchment shadow-pixel">
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
                name="spoon"
                size={13}
                pixel
                className="animate-chip-pour text-jar-800"
              />
            ))}
          </div>
        )}
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
  );
}

function LedgerStat({
  icon,
  value,
  label,
  tone,
  live,
}: {
  icon: IconName;
  value: number;
  label: string;
  tone: string;
  live?: boolean;
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
      <span>{value}</span>
      <span className="font-semibold">{label}</span>
    </span>
  );
}

export function JarScreen() {
  const [preset, setPreset] = useState<JarState>('healthy');
  const [total, setTotal] = useState(PRESETS.healthy.total);
  const [spent, setSpent] = useState(PRESETS.healthy.spent);
  const [step, setStep] = useState(0.5);
  const [logs, setLogs] = useState<Log[]>([
    { id: 1, amount: 2, label: 'Morning shower' },
    { id: 2, amount: 1, label: 'Work call' },
  ]);
  const [nextId, setNextId] = useState(3);
  const navigate = useNavigate();

  const remaining = Math.max(0, total - spent);
  const borrowed = Math.max(0, spent - total);
  const state: JarState =
    borrowed > 0 ? 'overdrawn' : remaining <= 3 ? 'low' : 'healthy';
  const meta = STATE_META[state];

  const applyPreset = (next: JarState) => {
    setPreset(next);
    setTotal(PRESETS[next].total);
    setSpent(PRESETS[next].spent);
  };

  const logSpoon = () => {
    setSpent((s) => s + step);
    setLogs((current) => [...current, { id: nextId, amount: step }]);
    setNextId((id) => id + 1);
  };

  const deleteLog = (id: number) =>
    setLogs((current) => current.filter((log) => log.id !== id));

  const maxHistory = Math.max(...HISTORY.map((d) => d.value));
  const maxPattern = Math.max(...PATTERNS.map((p) => p.value));

  return (
    <div className="flex flex-col gap-6">
      {/* Accent title band + back to the hub */}
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

      <Card variant="raised" padding="lg" className="pixel-card flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Today's jar</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Reset at midnight · {total} spoons today
            </p>
          </div>
          <SegmentedControl
            label="Demo jar state"
            value={preset}
            onChange={(value) => applyPreset(value as JarState)}
            className="max-w-64"
            options={[
              { value: 'healthy', label: 'Healthy' },
              { value: 'low', label: 'Low' },
              { value: 'overdrawn', label: 'Overdrawn' },
            ]}
            pixel
          />
        </div>

        {/* State banner — icon + label + copy, never colour alone */}
        <div
          className={cx(
            'mt-5 flex items-start gap-3 rounded-xl border p-4',
            state === 'overdrawn' &&
              'border-overdrawn-line bg-overdrawn-soft text-overdrawn-ink',
            state === 'low' &&
              'border-low-line bg-low-soft text-low-ink',
            state === 'healthy' && 'border-jar-200 bg-jar-50 text-jar-800',
          )}
        >
          <Chip
            tone={
              state === 'healthy' ? 'jar' : state === 'low' ? 'low' : 'overdrawn'
            }
            icon={<Icon name={meta.icon} size={15} pixel />}
          >
            {meta.label}
          </Chip>
          <p role="status" className="text-base leading-relaxed">
            {meta.copy}
          </p>
        </div>

        {/* The jar */}
        <div className="mt-8">
          <JarVessel total={total} remaining={remaining} borrowed={borrowed} />
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <LedgerStat
              icon="spoon"
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

        {/* Quick add */}
        <div className="mt-8">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">
            Log a spoonful
          </h3>
          <p className="mb-3 mt-1 text-sm text-ink-soft">
            Takes about ten seconds — that's the point.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Stepper
              label="Spoons spent"
              value={step}
              onChange={setStep}
              step={0.5}
              min={0.5}
              max={5}
              pixel
            />
            <Button
              onClick={logSpoon}
              className="pixel-btn"
              leadingIcon={<Icon name="plus" size={18} pixel />}
            >
              Log {formatAmount(step)}
            </Button>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Optional label — e.g. "shower", "work call", "social event" (≤40
            chars, used for your pattern view).
          </p>
        </div>

        {/* Today's log */}
        <div className="mt-6 rounded-xl border border-line p-4">
          <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
            Today's log
          </h3>
          {logs.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-ink">
                    <Icon name="spoon" size={16} pixel className="text-jar-600" />
                    {log.label ?? 'No label'}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-ink-soft">
                    {formatAmount(log.amount)} spoons
                    <IconButton
                      icon="edit"
                      label={`Edit "${log.label ?? 'untitled'}"`}
                      variant="ghost"
                      pixel
                      onClick={() => undefined}
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
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-soft">
              Nothing logged yet today. The jar stays full until you spend.
            </p>
          )}
        </div>

        {/* History + patterns */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
              Last 7 days
            </h3>
            <div className="flex items-end justify-between gap-2" aria-hidden="true">
              {HISTORY.map((day) => (
                <div
                  key={day.day}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-xs font-bold tabular-nums text-ink-soft">
                    {day.value}
                  </span>
                  <span
                    className="w-full rounded-t-md bg-jar-300"
                    style={{ height: `${(day.value / maxHistory) * 56}px` }}
                  />
                  <span className="text-xs font-bold text-ink-soft">
                    {day.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
              Where your spoons went
            </h3>
            <div className="flex flex-col gap-2">
              {PATTERNS.map((pattern) => (
                <div key={pattern.label} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate font-semibold text-ink-soft">
                    {pattern.label}
                  </span>
                  <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface-strong">
                    <span
                      className="block h-full rounded-full bg-jar-400"
                      style={{
                        width: `${(pattern.value / maxPattern) * 100}%`,
                      }}
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
  );
}
