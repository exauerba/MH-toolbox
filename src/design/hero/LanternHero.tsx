import { useState } from 'react'
import { Button, Card, Chip, SegmentedControl, Stepper } from '../primitives'
import { Icon } from '../icons'
import { SpecPanel } from './SpecPanel'
import { cx } from '../cx'
import { STARTER_LEVELS } from '../../features/lantern/starterScale'
import { isCrisisLevel, toneForLevel, type LanternTone } from '../../features/lantern/present'
import { DEFAULT_CRISIS_REGION_ID, CRISIS_REGIONS } from '../../shared/crisis'

const LEVEL_COUNT = STARTER_LEVELS.length

/** Flame + glow colour per tone — the lantern brightens as the scale climbs. */
const TONE_GLOW: Record<LanternTone, { flame: string; glow: string; ring: string }> = {
  calm: { flame: '#97cbc2', glow: 'rgba(151,203,194,0.35)', ring: 'border-lantern-300' },
  rising: { flame: '#6fb2a6', glow: 'rgba(111,178,166,0.45)', ring: 'border-lantern-400' },
  high: { flame: '#e8a13c', glow: 'rgba(232,161,60,0.5)', ring: 'border-warning-300' },
  crisis: { flame: '#d96c5a', glow: 'rgba(217,108,90,0.6)', ring: 'border-error-300' },
}

/** Banner copy per tone — never colour-alone: chip label + guidance line. */
const TONE_BANNER: Record<LanternTone, { label: string; copy: string }> = {
  calm: { label: 'Calm', copy: "You're steady. Just being here is enough." },
  rising: { label: 'Rising', copy: "Something's off. Slow down, stay close, ask what they need." },
  high: { label: 'High', copy: 'This is a lot. Keep your voice low and your presence steady.' },
  crisis: { label: 'Crisis', copy: 'Stay with them. Do not leave them alone. Call 988 together.' },
}

/**
 * LANTERN — live hero visual + spec.
 * A lantern that glows brighter as the scale climbs. Pick a level and the
 * flame warms, the glow widens, and the supporter guidance appears — the
 * exact hand-over moment the tool is built for.
 */
export function LanternHero() {
  const [position, setPosition] = useState(1)
  const level = STARTER_LEVELS[position - 1]
  const tone = toneForLevel({ position }, LEVEL_COUNT)
  const crisis = isCrisisLevel({ position }, LEVEL_COUNT)
  const glow = TONE_GLOW[tone]
  const banner = TONE_BANNER[tone]
  const region = CRISIS_REGIONS.find((r) => r.id === DEFAULT_CRISIS_REGION_ID)!
  const hotline = region.resources[0]

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card variant="raised" padding="lg" className="pixel-card flex-1">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display flex items-center gap-2 text-xl font-bold text-ink">
              <span className="pixel-tile flex size-10 items-center justify-center rounded-none bg-lantern-50 text-lantern-700 dark:bg-lantern-500/20 dark:text-lantern-300">
                <Icon name="lantern" size={22} pixel />
              </span>
              Lantern
            </h3>
            <p className="mt-1 text-sm text-ink-soft">Where I am, and what helps — handed over in the moment.</p>
          </div>
          <SegmentedControl
            label="Demo level"
            value={String(position)}
            onChange={(v) => setPosition(Number(v))}
            options={STARTER_LEVELS.map((_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
            className="max-w-64"
            pixel
          />
        </div>

        {/* The lantern — glow scales with position */}
        <div className="relative mx-auto mt-2 flex h-56 w-56 items-center justify-center" aria-hidden="true">
          {/* Glow halo */}
          <div
            className="absolute rounded-full transition-all duration-500"
            style={{
              width: `${64 + position * 14}px`,
              height: `${64 + position * 14}px`,
              background: `radial-gradient(circle, ${glow.glow} 0%, transparent 70%)`,
            }}
          />
          {/* Lantern body */}
          <div className="relative flex flex-col items-center">
            <div
              className={cx('h-3 w-10 rounded-t-full border-2 border-b-0', glow.ring)}
              style={{ backgroundColor: `${glow.flame}22` }}
            />
            <div
              className="flex h-16 w-12 items-center justify-center rounded-b-xl border-2"
              style={{ borderColor: glow.flame, backgroundColor: `${glow.flame}14` }}
            >
              <span
                className="block size-5 rounded-full transition-colors duration-500"
                style={{ backgroundColor: glow.flame, boxShadow: `0 0 ${8 + position * 3}px ${glow.flame}` }}
              />
            </div>
            <div className="h-2 w-14 rounded-b border-2 border-t-0" style={{ borderColor: glow.flame }} />
            <div className="mt-1 h-1.5 w-4 rounded-full" style={{ backgroundColor: glow.flame }} />
          </div>
          {/* Level numeral */}
          <span
            className="absolute -right-2 -top-2 flex size-12 items-center justify-center rounded-full border-2 font-display text-xl font-extrabold"
            style={{ borderColor: glow.flame, color: glow.flame, backgroundColor: 'var(--color-surface)' }}
          >
            {position}
          </span>
        </div>

        {/* State banner — never colour-alone: chip icon + label + copy */}
        <div
          className={cx(
            'mt-4 flex items-start gap-3 rounded-xl border p-4',
            crisis && 'border-error-300 bg-error-soft text-error-ink',
            tone === 'high' && 'border-warning-300 bg-warning-soft text-warning-ink',
            (tone === 'calm' || tone === 'rising') && 'border-lantern-200 bg-lantern-50 text-lantern-800',
          )}
        >
          <Chip tone="lantern" icon={<Icon name="sparkle" size={15} pixel />}>
            {banner.label}
          </Chip>
          <p className="text-base leading-relaxed" role="status">
            {banner.copy}
          </p>
        </div>

        {/* Level content */}
        <div className="mt-5 rounded-xl border border-line bg-surface-muted p-4">
          <p className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">
            Level {position} — {level.label}
          </p>
          <p className="mt-2 text-base leading-relaxed text-ink">{level.description}</p>
          <p className="mt-4 text-sm font-extrabold uppercase tracking-wide text-ink-soft">What helps right now</p>
          <ul className="mt-2 flex flex-col gap-2">
            {level.actions.map((action) => (
              <li key={action} className="flex items-start gap-2 text-sm leading-relaxed text-ink">
                <Icon name="sparkle" size={15} className="mt-0.5 shrink-0 text-lantern-600" />
                {action}
              </li>
            ))}
          </ul>
        </div>

        {/* Crisis callout on top levels */}
        {crisis && (
          <div className="mt-4 rounded-xl border border-error-300 bg-error-soft p-4 text-error-ink">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <Icon name="alert" size={16} />
              {hotline.name} — {hotline.detail}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{region.label} · crisis support is always available.</p>
          </div>
        )}

        {/* Controls */}
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <Stepper label="Level" value={position} onChange={setPosition} step={1} min={1} max={LEVEL_COUNT} pixel />
          <Button
            onClick={() => setPosition((p) => (p % LEVEL_COUNT) + 1)}
            className="pixel-btn"
            leadingIcon={<Icon name="play" size={18} pixel />}
          >
            Walk the scale
          </Button>
        </div>
      </Card>

      <SpecPanel
        owner="WP12 · Lantern"
        title="Lantern hero visual"
        className="lg:w-80 xl:w-96"
        sections={[
          {
            heading: 'Structure',
            items: [
              <span key="s1">
                <strong>LanternView</strong> (Card raised) → <strong>LanternVisual</strong> + <strong>StateBanner</strong> + <strong>LevelCard</strong> + <strong>CrisisCallout</strong> + <strong>Controls</strong>.
              </span>,
              <span key="s2">
                The lantern is pure CSS: dome + body + base, with a flame whose colour and glow radius scale with the level position.
              </span>,
            ],
          },
          {
            heading: 'Tokens',
            items: [
              <span key="t1">Lantern accent: <code>lantern-*</code> ramp (sea-glass teal).</span>,
              <span key="t2">
                Tones: <code>calm</code>/<code>rising</code> = lantern family, <code>high</code> = warning family,{' '}
                <code>crisis</code> = error family — always with icon + label + copy.
              </span>,
              <span key="t3">
                Glow uses <code>radial-gradient</code> halos sized <code>64 + position × 14</code> px; flame shadow{' '}
                <code>0 0 {`8 + position × 3`}px</code>.
              </span>,
            ],
          },
          {
            heading: 'States & copy (verbatim)',
            items: [
              <span key="c1">calm → “You're steady. Just being here is enough.”</span>,
              <span key="c2">rising → “Something's off. Slow down, stay close, ask what they need.”</span>,
              <span key="c3">high → “This is a lot. Keep your voice low and your presence steady.”</span>,
              <span key="c4">crisis → “Stay with them. Do not leave them alone. Call 988 together.”</span>,
              <span key="c5">
                The message line is <code>role="status"</code>; the crisis callout surfaces the region's hotline.
              </span>,
            ],
          },
          {
            heading: 'Controls',
            items: [
              <span key="q1">
                Stepper at <code>1</code> steps (min 1, max 10) + “Walk the scale” button that advances one level at a time.
              </span>,
              <span key="q2">
                SegmentedControl jumps straight to any level — the same quick-locate the present mode offers.
              </span>,
            ],
          },
          {
            heading: 'Reduced motion',
            items: [
              <span key="r1">
                Default: glow and flame transition over <code>500ms</code> so the brightening reads as a slow warm-up.
              </span>,
              <span key="r2">
                Reduced-motion: the global kill-switch collapses transitions to instant — the flame still changes colour, the copy is identical.
              </span>,
            ],
          },
        ]}
      />
    </div>
  )
}