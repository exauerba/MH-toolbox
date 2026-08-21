import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from '../../app/shell/theme'
import {
  Alert,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Modal,
  ProgressBar,
  SegmentedControl,
  Select,
  Stepper,
  TextArea,
  TextInput,
  Toggle,
  Tooltip,
} from '../primitives'
import { Icon } from '../icons'
import type { IconName } from '../icons'
import { colors, motion, radius, spacing, typography } from '../tokens'
import { syncReducedMotionAttribute } from '../motion'
import { JarHero } from '../hero/JarHero'
import { TimelineHero } from '../hero/TimelineHero'
import { HubHero } from '../hero/HubHero'
import { cx } from '../cx'

/* ---- colour utilities for live contrast badges ----------------------- */

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function ContrastBadge({ fg, bg }: { fg: string; bg: string }) {
  const ratio = contrastRatio(fg, bg)
  const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA (large)' : 'FAIL'
  const tone = ratio >= 4.5 ? 'ok' : ratio >= 3 ? 'low' : 'overdrawn'
  return (
    <span
      className={cx(
        'rounded-full px-2 py-0.5 text-2xs font-extrabold',
        tone === 'ok' && 'bg-success-soft text-success-ink',
        tone === 'low' && 'bg-low-soft text-low-ink',
        tone === 'overdrawn' && 'bg-overdrawn-soft text-overdrawn-ink',
      )}
    >
      {level} · {ratio.toFixed(2)}
    </span>
  )
}

/* ---- small layout helpers --------------------------------------------- */

function Section({
  id,
  kicker,
  title,
  intro,
  children,
}: {
  id: string
  kicker: string
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-10 sm:pt-14">
      <p className="text-sm font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-300">{kicker}</p>
      <h2 className="font-display mt-1 text-3xl font-bold text-ink sm:text-4xl">{title}</h2>
      {intro && <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">{intro}</p>}
      <div className="mt-8">{children}</div>
    </section>
  )
}

function DemoCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card variant="soft" padding="md" className="flex flex-col gap-4">
      <p className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">{label}</p>
      {children}
    </Card>
  )
}

function Swatch({
  name,
  hex,
  fg,
  className,
}: {
  name: string
  hex: string
  fg: string
  className?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cx('flex h-16 items-end rounded-lg border border-line p-2', className)}
        style={{ backgroundColor: hex }}
      >
        <span className="rounded bg-black/20 px-1.5 py-0.5 text-2xs font-bold text-white">{hex}</span>
      </div>
      <p className="text-sm font-bold text-ink">{name}</p>
      <ContrastBadge fg={fg} bg={hex} />
    </div>
  )
}

/** The light ramp steps of a colour family are decorative — their text lives
 * on the darker steps. This keeps the styleguide honest without fake badges. */
function RampNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-ink-soft">{children}</p>
}

/* ---- the page ---------------------------------------------------------- */

export default function Styleguide() {
  const { theme, setTheme } = useTheme()
  const [simulateReduced, setSimulateReduced] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [stepperValue, setStepperValue] = useState(2.5)
  const [toggleOn, setToggleOn] = useState(true)
  const [chipOn, setChipOn] = useState(true)
  const [region, setRegion] = useState('us')
  const [email, setEmail] = useState('')
  const [entrance, setEntrance] = useState(0)

  const toggleReduced = (on: boolean) => {
    setSimulateReduced(on)
    syncReducedMotionAttribute(on)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
      {/* Top controls */}
      <div className="sticky top-0 z-40 -mx-4 mb-10 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display flex items-center gap-2 text-sm font-extrabold text-ink">
            <Icon name="sparkle" size={16} className="text-brand-600" />
            steady — design styleguide
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Toggle
              checked={simulateReduced}
              onChange={toggleReduced}
              label="Simulate reduced motion"
              ariaLabel="Simulate reduced motion"
            />
            <SegmentedControl
              label="Styleguide theme"
              value={theme}
              onChange={(v) => setTheme(v as 'light' | 'dark')}
              options={[
                { value: 'light', label: 'Light', icon: 'sun' },
                { value: 'dark', label: 'Dark', icon: 'moon' },
              ]}
              className="w-44"
              pixel
            />
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="pb-4 pt-10">
        <h1 className="font-display text-5xl font-extrabold tracking-tight text-brand-700 dark:text-brand-300">steady</h1>
        <p className="mt-3 max-w-2xl text-2xl font-bold leading-snug text-ink">
          A toolbox you can hold onto at your lowest point — warm, quiet, and never clinical.
        </p>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
          This is the living design system every feature builds against: tokens, primitives, and exact specifications
          for the three visuals you'll look at most — the Energy Jar, your Timeline, and the hub cards. Continuous with
          bloom's warmth, but its own calm character.
        </p>
        <p className="mt-6 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 p-4 text-base text-brand-900 dark:border-brand-300/30 dark:bg-brand-300/10 dark:text-brand-200">
          <Icon name="heart" size={20} />
          The review question: does this feel like something you'd hand a dysregulated person at their lowest point?
          If yes, feature builds begin.
        </p>
      </header>

      {/* Principles */}
      <Section
        id="principles"
        kicker="01 · Principles"
        title="Hand this to a person at their lowest"
        intro="Six rules that gate every design decision in steady. Feature work packages don't get to bend them."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: 'heart' as IconName,
              title: 'Warmth before information',
              body: 'Rounded corners, soft shadows, honey-and-rose tones. Nothing here should read like a hospital or a spreadsheet.',
            },
            {
              icon: 'leaf' as IconName,
              title: 'Nothing to figure out',
              body: 'One obvious action per view. 44px touch targets. No dead ends, no surprise taps. If a state is confusing, it is a bug.',
            },
            {
              icon: 'spoon' as IconName,
              title: 'Kind in every state',
              body: 'Running low is okay. Overdrawn is “information, not failure”. The app never scolds — it holds.',
            },
            {
              icon: 'moon' as IconName,
              title: 'Stillness by default',
              body: 'Calm, short motion. Every animation has a zero-motion equivalent, and prefers-reduced-motion is treated as a first-class audience, not an afterthought.',
            },
            {
              icon: 'check' as IconName,
              title: 'Never colour alone',
              body: 'Every state carries an icon, a label, and a shape change. Colour supports meaning; it never is the meaning. WCAG 2.1 AA throughout.',
            },
            {
              icon: 'lock' as IconName,
              title: "It's theirs",
              body: 'Guest data stays on the device. Nothing is shared, exported, or shown anywhere without an explicit choice.',
            },
          ].map((p) => (
            <Card key={p.title} variant="soft" padding="md" className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-300/20 dark:text-brand-300">
                <Icon name={p.icon} size={22} />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-ink">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{p.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Colour */}
      <Section
        id="colour"
        kicker="02 · Colour"
        title="Warm linen, rosewater, honey & sage"
        intro="Every pair below is utility-verified WCAG 2.1 AA — badges compute the live ratio against the surface behind the text. Status is never colour-alone: it always ships with an icon, a label, and a pattern."
      >
        <div className="flex flex-col gap-8">
          <DemoCard label="Neutrals — the calm ground">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Swatch name="canvas" hex={colors.canvas} fg={colors.ink} />
              <Swatch name="surface" hex={colors.surface} fg={colors.ink} />
              <Swatch name="surface-muted" hex={colors.surfaceMuted} fg={colors.ink} />
              <Swatch name="surface-strong" hex={colors.surfaceStrong} fg={colors.ink} />
              <Swatch name="ink" hex={colors.ink} fg={colors.canvas} />
              <Swatch name="ink-soft" hex={colors.inkSoft} fg={colors.canvas} />
              <Swatch name="ink-faint" hex={colors.inkFaint} fg={colors.canvas} />
              <Swatch name="focus ring" hex={colors.focus} fg={colors.canvas} />
            </div>
          </DemoCard>

          <DemoCard label="Brand — steady rose (hub)">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
              {Object.entries(colors.brand).map(([step, hex]) => (
                <Swatch key={step} name={`brand-${step}`} hex={hex} fg={step >= '600' ? '#fffdfa' : '#3e1d13'} />
              ))}
            </div>
            <RampNote>
              Text on the brand: dark ink on <code>50–400</code>, white on <code>600–900</code>.{' '}
              <code>brand-500</code> is a decorative mid-tone (large-text AA).
            </RampNote>
          </DemoCard>

          <DemoCard label="Per-tool accents — distinct, yet one family">
            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <p className="mb-3 text-sm font-extrabold text-ink">Energy Jar — honey</p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(colors.jar)
                    .filter(([step]) => step !== '900')
                    .map(([step, hex]) => (
                      <Swatch key={step} name={step} hex={hex} fg={step >= '500' ? '#fffdfa' : '#3f2505'} />
                    ))}
                </div>
                <RampNote>Text uses <code>jar-700</code> on light fills; <code>jar-500</code> fills never carry text.</RampNote>
              </div>
              <div>
                <p className="mb-3 text-sm font-extrabold text-ink">Timeline — sage</p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(colors.timeline)
                    .filter(([step]) => step !== '900')
                    .map(([step, hex]) => (
                      <Swatch key={step} name={step} hex={hex} fg={step >= '500' ? '#fffdfa' : '#23301f'} />
                    ))}
                </div>
                <RampNote>Text uses <code>timeline-700</code> on light fills.</RampNote>
              </div>
              <div>
                <p className="mb-3 text-sm font-extrabold text-ink">bloom — its own pink</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(colors.bloom)
                    .filter(([step]) => step !== '900' && step !== 'tint')
                    .map(([step, hex]) => (
                      <Swatch key={step} name={step} hex={hex} fg={step >= '400' ? '#ffffff' : '#4d3c42'} />
                    ))}
                </div>
                <RampNote>
                  bloom's own hexes, verbatim. Its text accent is <code>bloom-600</code> (#a84f6b);{' '}
                  <code>bloom-400</code> (#f472b6) is the signature pink and is decorative.
                </RampNote>
              </div>
            </div>
          </DemoCard>

          <DemoCard label="Status — always with icon + label + pattern">
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                { name: 'ok / healthy', hex: colors.success.soft, fg: colors.success.ink, icon: 'check' as IconName },
                { name: 'running low', hex: colors.low.soft, fg: colors.low.ink, icon: 'gauge' as IconName },
                { name: 'overdrawn', hex: colors.overdrawn.soft, fg: colors.overdrawn.ink, icon: 'heart' as IconName },
                { name: 'error', hex: colors.error.soft, fg: colors.error.ink, icon: 'alert' as IconName },
                { name: 'info', hex: colors.info.soft, fg: colors.info.ink, icon: 'info' as IconName },
                { name: 'warning', hex: colors.warning.soft, fg: colors.warning.ink, icon: 'gauge' as IconName },
              ].map((s) => (
                <div
                  key={s.name}
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={{ backgroundColor: s.hex, borderColor: 'color-mix(in srgb, ' + s.hex + ' 80%, black 8%)' }}
                >
                  <Icon name={s.icon} size={20} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold" style={{ color: s.fg }}>
                      {s.name}
                    </p>
                    <p className="text-xs" style={{ color: s.fg }}>
                      Icon + label always present
                    </p>
                  </div>
                  <ContrastBadge fg={s.fg} bg={s.hex} />
                </div>
              ))}
            </div>
          </DemoCard>
        </div>
      </Section>

      {/* Typography */}
      <Section
        id="typography"
        kicker="03 · Typography"
        title="Fredoka, at 16px, breathing room for tired eyes"
        intro="Rounded and warm, with optical sizing that stays legible at small sizes. Base is never below 16px for anything essential."
      >
        <div className="flex flex-col gap-5">
          {Object.entries(typography.scale).map(([name, t]) => (
            <div key={name} className="flex items-baseline gap-4 border-b border-line pb-4">
              <span className="w-16 shrink-0 text-sm font-bold text-ink-faint">{name}</span>
              <span className="flex-1" style={{ fontSize: t.size, lineHeight: t.lineHeight, fontWeight: 700 }}>
                steady meets you where you are
              </span>
              <span className="hidden text-xs text-ink-faint sm:block">
                {t.size} / {t.lineHeight}
              </span>
            </div>
          ))}
          <p className="text-sm text-ink-soft">
            Weights in use: <strong>400</strong> (body), <strong>600</strong> (emphasis), <strong>700</strong>{' '}
            (labels), <strong>800</strong> (headings & actions).
          </p>
        </div>
      </Section>

      {/* Space & shape */}
      <Section
        id="space"
        kicker="04 · Space & shape"
        title="A 4px grid, generous corners, soft shadows"
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <DemoCard label="Spacing (4px base)">
            <div className="flex flex-col gap-2">
              {Object.entries(spacing)
                .filter(([, value]) => value !== '0')
                .slice(0, 8)
                .map(([name, value]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-10 text-xs font-bold text-ink-faint">{name}</span>
                    <span className="h-4 rounded bg-brand-300" style={{ width: value }} />
                    <span className="text-xs text-ink-faint">{value}</span>
                  </div>
                ))}
            </div>
          </DemoCard>
          <DemoCard label="Radius — warm, never clinical">
            <div className="flex flex-wrap gap-4">
              {Object.entries(radius).map(([name, value]) => (
                <div key={name} className="flex flex-col items-center gap-2">
                  <span className="size-16 border-2 border-brand-400 bg-brand-50" style={{ borderRadius: value }} />
                  <span className="text-xs font-bold text-ink-soft">{name}</span>
                </div>
              ))}
            </div>
          </DemoCard>
          <DemoCard label="Shadows — soft & warm">
            <div className="flex flex-col gap-4">
              {(['soft', 'lift', 'press', 'pop'] as const).map((s) => (
                <div key={s} className="rounded-lg bg-surface px-4 py-3 text-sm font-bold text-ink-soft" style={{ boxShadow: `var(--shadow-${s})` }}>
                  {s}
                </div>
              ))}
            </div>
          </DemoCard>
        </div>
      </Section>

      {/* Motion */}
      <Section
        id="motion"
        kicker="05 · Motion"
        title="Calm by default. Still when asked."
        intro="Durations stay under 400ms; nothing ever whooshes. And every single animation has a zero-motion equivalent — if a state is only readable mid-animation, that's a bug. Flip the toggle up top to feel the reduced-motion experience."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <DemoCard label="Durations & easings">
            <div className="flex flex-col gap-3">
              {Object.entries(motion.durations).map(([name, value]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-bold text-ink-faint">{name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-strong">
                    <div
                      className="h-full w-full rounded-full bg-brand-500"
                      style={{
                        transformOrigin: 'left',
                        transitionProperty: 'transform',
                        transitionDuration: value,
                        transitionTimingFunction: 'var(--ease-out)',
                      }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs tabular-nums text-ink-soft">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-surface-muted p-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setEntrance((n) => n + 1)}
                leadingIcon={<Icon name="sparkle" size={16} />}
              >
                Play entrance
              </Button>
              <div className="min-h-11 flex-1">
                {entrance > 0 && (
                  <span
                    key={entrance}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-brand-200 bg-brand-100 px-4 text-sm font-bold text-brand-800 dark:border-brand-300/30 dark:bg-brand-300/20 dark:text-brand-300 animate-pop-in"
                  >
                    <Icon name="check" size={15} />
                    A calm entrance
                  </span>
                )}
              </div>
              <p className="w-full text-sm text-ink-soft">
                With reduced motion simulated, the same chip appears instantly — final state is identical. The chip pour
                in the Energy Jar works exactly this way.
              </p>
            </div>
          </DemoCard>
          <DemoCard label="Reduced-motion contract">
            <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-soft">
              <p>
                <strong className="text-ink">1. Global kill-switch.</strong> <code>@media (prefers-reduced-motion:
                reduce)</code> collapses every animation to a 0.01ms change. The same rule applies to{' '}
                <code>html[data-reduced-motion]</code> for previews and tests.
              </p>
              <p>
                <strong className="text-ink">2. Final state at rest.</strong> Motion never carries meaning; components
                render their complete state with or without animation.
              </p>
              <p>
                <strong className="text-ink">3. Branch in JS too.</strong> <code>usePrefersReducedMotion()</code> lets a
                component skip a pour or stagger entirely, not just shorten it.
              </p>
              <p>
                <strong className="text-ink">4. Motion allowed.</strong> Opacity fades that aid comprehension are kept
                minimal; movement is removed.
              </p>
            </div>
          </DemoCard>
        </div>
      </Section>

      {/* Primitives */}
      <Section
        id="primitives"
        kicker="06 · Primitives"
        title="The shared parts every tool is built from"
        intro="All controls are ≥44px targets, keyboard- and screen-reader-friendly, with focus-visible rings and never colour-alone states. Feature work packages import these from src/design."
      >
        <div className="flex flex-col gap-6">
          <DemoCard label="Button">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Logging…</Button>
              <Button variant="secondary" size="lg" leadingIcon={<Icon name="plus" size={18} />}>
                Large with icon
              </Button>
            </div>
            <p className="text-sm text-ink-soft">
              Press feedback is a 0.97 scale (120ms); hover lifts 1px; focus shows the ring. Min height 44px.
            </p>
          </DemoCard>

          <DemoCard label="IconButton — always labelled">
            <div className="flex flex-wrap items-center gap-3">
              <IconButton icon="star" label="Pin Energy Jar to home" />
              <IconButton icon="star" label="Pin Energy Jar to home" variant="soft" filled />
              <IconButton icon="plus" label="Add spoon" variant="filled" round />
              <IconButton icon="trash" label="Delete entry" variant="ghost" />
              <IconButton icon="close" label="Dismiss" variant="secondary" />
              <IconButton icon="edit" label="Edit entry" variant="ghost" disabled />
            </div>
            <p className="text-sm text-ink-soft">IconButtons require a label prop — it becomes aria-label and title.</p>
          </DemoCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <DemoCard label="Chip">
              <div className="flex flex-wrap items-center gap-2">
                <Chip>neutral</Chip>
                <Chip tone="brand">brand</Chip>
                <Chip tone="jar">jar</Chip>
                <Chip tone="timeline">timeline</Chip>
                <Chip tone="bloom">bloom</Chip>
                <Chip tone="low">running low</Chip>
                <Chip tone="overdrawn">overdrawn</Chip>
              </div>
              <Chip tone="jar" selected={chipOn} onToggle={setChipOn}>
                Toggleable filter chip
              </Chip>
            </DemoCard>

            <DemoCard label="Stepper">
              <Stepper label="Spoons" value={stepperValue} onChange={setStepperValue} step={0.5} min={0.5} max={5} />
              <p className="text-sm text-ink-soft">
                Half-step support, 44px buttons, live-region announcement. Max 5 for a single log (under 10s).
              </p>
            </DemoCard>

            <DemoCard label="Toggle">
              <Toggle checked={toggleOn} onChange={setToggleOn} label="Gentle reminders" description="A soft nudge, never an alarm." />
              <Toggle checked={false} onChange={() => {}} label="Disabled setting" disabled />
            </DemoCard>

            <DemoCard label="SegmentedControl">
              <SegmentedControl
                label="Crisis region"
                value={region}
                onChange={setRegion}
                options={[
                  { value: 'us', label: 'US' },
                  { value: 'ca', label: 'CA' },
                  { value: 'uk', label: 'UK' },
                  { value: 'au', label: 'AU' },
                ]}
              />
              <p className="text-sm text-ink-soft">
                Real radios inside a radiogroup — arrow keys and focus management are native. For theme & region
                switching later.
              </p>
            </DemoCard>

            <DemoCard label="TextInput & TextArea">
              <TextInput
                label="What did you spend it on?"
                placeholder="e.g. shower, work call…"
                maxLength={40}
              />
              <TextInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={email.length > 0 && !email.includes('@') ? "That doesn't look like an email yet." : undefined}
                hint="Only used to sign in — never shared."
              />
              <TextArea label="How does it feel right now?" placeholder="Say as much or as little as you like." />
            </DemoCard>

            <DemoCard label="Select">
              <Select
                label="Today's jar size"
                placeholder="Choose…"
                options={[
                  { value: '8', label: '8 — a gentle day' },
                  { value: '10', label: '10 — the usual' },
                  { value: '12', label: '12 — a big day' },
                ]}
              />
            </DemoCard>
          </div>

          <DemoCard label="Alert — four tones, never colour-alone">
            <div className="flex flex-col gap-3">
              <Alert variant="info" title="Signing in backs this up">
                Your data syncs to your account — it's still only ever yours.
              </Alert>
              <Alert variant="success" title="Jar logged">
                2 spoons, “shower”. 6 of 12 remain.
              </Alert>
              <Alert variant="warning" title="Running low">
                You have 2 spoons left. Maybe the most important thing today is rest.
              </Alert>
              <Alert variant="error" title="Couldn't save that entry" dismissible onDismiss={() => {}}>
                Your timeline is stored on this device. It's probably a temporary hiccup — try again.
              </Alert>
            </div>
          </DemoCard>

          <DemoCard label="ProgressBar">
            <ProgressBar label="Remaining today" valueText="8 of 12 spoons" value={66.6} tone="ok" />
            <ProgressBar label="Running low" valueText="2 of 12 spoons" value={16.6} tone="low" />
            <ProgressBar label="Overdrawn" valueText="15 of 12 spoons" value={100} tone="overdrawn" />
          </DemoCard>

          <DemoCard label="Modal">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setModalOpen(true)}>Open modal</Button>
              <p className="text-sm text-ink-soft">
                Focus-trapped, Esc & backdrop close, focus restored on close. One question at a time.
              </p>
            </div>
          </DemoCard>

          <DemoCard label="EmptyState">
            <EmptyState
              icon="leaf"
              title="A quiet place to start"
              body="Nothing here yet, and that's fine. When you're ready, the first step is a small one."
              action={<Button>Get started</Button>}
            />
          </DemoCard>

          <DemoCard label="Tooltip">
            <Tooltip label="This is a tooltip — it appears on hover AND keyboard focus.">
              <Button variant="secondary">Hover or focus me</Button>
            </Tooltip>
          </DemoCard>
        </div>
      </Section>

      {/* Hero visuals */}
      <Section
        id="hero-visuals"
        kicker="07 · Hero visuals"
        title="The three things you'll look at most"
        intro="Each is rendered live below with mock data so the direction can be felt, and shipped with an exact implementation spec for the feature work package that builds it."
      >
        <div className="flex flex-col gap-14">
          <div>
            <h3 className="mb-1 text-2xl font-extrabold text-ink">The Energy Jar</h3>
            <p className="mb-5 max-w-2xl text-base leading-relaxed text-ink-soft">
              Spoon theory, made legible at a glance. Chips move from the jar to the spent tray; states are gentle and
              never shaming. Build by WP6.
            </p>
            <JarHero />
          </div>

          <div>
            <h3 className="mb-1 text-2xl font-extrabold text-ink">The Timeline zones</h3>
            <p className="mb-5 max-w-2xl text-base leading-relaxed text-ink-soft">
              Your history as bands and cards — zones you name and colour yourself, always shown with their name, never
              colour alone. Build by WP9.
            </p>
            <TimelineHero />
          </div>

          <div>
            <h3 className="mb-1 text-2xl font-extrabold text-ink">The hub tool cards</h3>
            <p className="mb-5 max-w-2xl text-base leading-relaxed text-ink-soft">
              The pin grid: favourites up top, full directory below, bloom's own pink on its card so the hand-off feels
              continuous. Build by WP5.
            </p>
            <HubHero />
          </div>
        </div>
      </Section>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-ink-faint">
        <p>steady design direction · WP3 · tokens, primitives, hero visuals, styleguide</p>
        <p className="flex items-center gap-2">
          <Icon name="heart" size={14} />
          warm, never clinical
        </p>
      </footer>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit today's total"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Save</Button>
          </>
        }
      >
        <Stepper label="Spoons today" value={12} onChange={() => {}} step={1} min={1} max={20} />
        <p className="mt-3 text-sm text-ink-soft">
          Capacity changes day to day — that's normal. You can always edit it.
        </p>
      </Modal>
    </div>
  )
}
