import { useState } from 'react'
import { Button, Card, Chip, IconButton, SegmentedControl, Stepper } from '../primitives'
import { Icon } from '../icons'
import { SpecPanel } from './SpecPanel'
import { cx } from '../cx'
import { colors } from '../tokens'

const PRESETS = [
  { value: 'calm', label: 'Calm', color: colors.breathe[500] },
  { value: 'focus', label: 'Focus', color: colors.breathe[400] },
  { value: 'energize', label: 'Energize', color: colors.breathe[600] },
] as const

type PresetValue = typeof PRESETS[number]['value']

export function BreatheHero() {
  const [preset, setPreset] = useState<PresetValue>('calm')
  const [progress, setProgress] = useState(50) // 0-100% of breath cycle

  const presetConfig = PRESETS.find(p => p.value === preset)!
  const phase = getPhase(progress)
  const phaseConfig = PHASES[phase]

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card variant="raised" padding="lg" className="pixel-card flex-1">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display flex items-center gap-2 text-xl font-bold text-ink">
              <span className="pixel-tile flex size-10 items-center justify-center rounded-none bg-breathe-50 text-breathe-700 dark:bg-breathe-500/20 dark:text-breathe-300">
                <Icon name="wind" size={22} pixel />
              </span>
              Breathe
            </h3>
            <p className="mt-1 text-sm text-ink-soft">Guided breathing exercises</p>
          </div>
          <SegmentedControl
            label="Breath pattern"
            value={preset}
            onChange={(v) => setPreset(v as PresetValue)}
            options={PRESETS.map(p => ({
              value: p.value,
              label: p.label,
            }))}
            className="max-w-64"
            pixel
          />
        </div>

        {/* State banner — never colour-alone: chip icon + label + copy */}
        <div
          className={cx(
            'flex items-start gap-3 rounded-xl border p-4',
            'border-breathe-300 bg-breathe-50 text-breathe-900',
          )}
        >
          <Chip
            tone="brand"
            icon={<Icon name={phaseConfig.icon} size={15} pixel className="text-breathe-900" />}
          >
            {phaseConfig.label}
          </Chip>
          <p className="text-base leading-relaxed" role="status">
            {phaseConfig.copy}
          </p>
        </div>

        {/* Breathing visual */}
        <div className="mt-6">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
            Breath cycle
          </p>
          <div className="relative h-48 w-48 mx-auto">
            {/* Background ring */}
            <div
              className="absolute inset-0 rounded-full border-8"
              style={{ borderColor: `${presetConfig.color}20` }}
            />
            {/* Progress ring */}
            <div
              className="absolute inset-0 rounded-full border-8"
              style={{
                borderColor: presetConfig.color,
                clip: `rect(0px, 48px, 48px, 24px)`,
                transform: `rotate(${progress * 3.6}deg)`,
              }}
            />
            {/* Center circle */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: presetConfig.color,
                width: '24px',
                height: '24px',
                margin: '12px',
              }}
            >
              <Icon name="wind" size={16} className="text-white" />
            </div>
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            {progress}% complete · {phaseConfig.label}
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Stepper
              label="Cycle progress"
              value={progress}
              onChange={setProgress}
              step={5}
              min={0}
              max={100}
              pixel
            />
<Button
  onClick={() => setProgress((p) => (p + 10) % 100)}
  className="pixel-btn"
  leadingIcon={<Icon name="refresh" size={18} pixel />}
>
  Advance
</Button>
          </div>
        </div>

        {/* Today's log */}
        <div className="mt-6 rounded-xl border border-line p-4">
          <p className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
            Today's breath log
          </p>
          <ul className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-3 py-2">
                <span className="flex items-center gap-2 text-ink">
                  <Icon name="wind" size={16} pixel className="text-breathe-600" />
                  Session {i}
                </span>
                <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-ink-soft">
                  5 min
                  <IconButton icon="trash" label={`Delete session ${i}`} variant="ghost" pixel />
                  <IconButton icon="edit" label={`Edit session ${i}`} variant="ghost" pixel />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <SpecPanel
        owner="WP10 · Breathe"
        title="Breathe hero visual"
        className="lg:w-80 xl:w-96"
        sections={[
          {
            heading: 'Structure',
            items: [
              <span key="s1">
                <strong>BreatheView</strong> (Card raised) → <strong>StateBanner</strong> + <strong>BreathingVisual</strong> + <strong>Controls</strong> + <strong>LogList</strong>
              </span>,
              <span key="s2">
                Breathing visual shows animated ring that grows/shrinks with breath cycle; center icon indicates phase.
              </span>,
            ],
          },
          {
            heading: 'Tokens',
            items: [
              <span key="t1">Breathe accent: <code>breathe-*</code> ramp (lilac/periwinkle).</span>,
              <span key="t2">
                Uses <code>breathe-500</code> for primary ring, <code>breathe-50</code> for background ring,{' '}
                <code>breathe-900</code> for text/icons.
              </span>,
            ],
          },
          {
            heading: 'States & copy (verbatim)',
            items: [
              <span key="c1">inhale → “Gently fill your belly like a balloon.”</span>,
              <span key="c2">
                hold → “Pause softly, noticing the stillness.”
              </span>,
              <span key="c3">
                exhale → “Slowly release, letting go of tension.”
              </span>,
              <span key="c4">
                hold → “Rest briefly before the next inhale.”
              </span>,
              <span key="c5">
                Each state chip leads with an icon + label; the message line is <code>role="status"</code>.
              </span>,
            ],
          },
          {
            heading: 'Controls',
            items: [
              <span key="c1">
                Stepper at <code>5</code>% steps (min 0, max 100) + “Advance” button (+10%) — demo controls for breath cycle position.
              </span>,
              <span key="c2">
                SegmentedControl switches breath pattern (Calm/Focus/Energize), changing accent color.
              </span>,
            ],
          },
        ]}
      />
    </div>
  )
}

const PHASES = {
  inhale: { label: 'Inhale', icon: 'wind', copy: 'Gently fill your belly like a balloon.' },
  holdIn: { label: 'Hold', icon: 'timer', copy: 'Pause softly, noticing the stillness.' },
  exhale: { label: 'Exhale', icon: 'wind', copy: 'Slowly release, letting go of tension.' },
  holdOut: { label: 'Hold', icon: 'timer', copy: 'Rest briefly before the next inhale.' },
} as const

function getPhase(progress: number): keyof typeof PHASES {
  // Simple 4-phase cycle: 0-25 inhale, 25-50 hold, 50-75 exhale, 75-100 hold
  if (progress < 25) return 'inhale'
  if (progress < 50) return 'holdIn'
  if (progress < 75) return 'exhale'
  return 'holdOut'
}