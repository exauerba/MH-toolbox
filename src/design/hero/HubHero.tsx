import { useState } from 'react'
import { Button, Card, Chip, IconButton } from '../primitives'
import { Icon } from '../icons'
import type { IconName } from '../icons'
import { SpecPanel } from './SpecPanel'
import { cx } from '../cx'

interface Tool {
  id: string
  name: string
  tagline: string
  icon: IconName
  tileClass: string
  external?: boolean
  badge?: string
}

const TOOLS: Tool[] = [
  {
    id: 'jar',
    name: 'Energy Jar',
    tagline: 'Spoon-theory tracker — see your energy at a glance.',
    icon: 'spoon',
    tileClass: 'bg-jar-100 text-jar-700 dark:bg-jar-300/20 dark:text-jar-300',
    badge: 'New',
  },
  {
    id: 'bloom',
    name: 'Mood & Symptom Tracker',
    tagline: 'Your daily check-ins and patterns, in bloom.',
    icon: 'sparkle',
    tileClass: 'bg-bloom-100 text-bloom-700 dark:bg-bloom-300/20 dark:text-bloom-300',
    external: true,
  },
  {
    id: 'timeline',
    name: 'Personal Timeline',
    tagline: 'Build the story of your life, one zone at a time.',
    icon: 'timeline',
    tileClass: 'bg-timeline-100 text-timeline-700 dark:bg-timeline-300/20 dark:text-timeline-300',
  },
  {
    id: 'more',
    name: 'More tools soon',
    tagline: 'The toolbox grows as you need it.',
    icon: 'sparkle',
    tileClass: 'bg-brand-100 text-brand-700 dark:bg-brand-300/20 dark:text-brand-300',
  },
]

/** New users start pre-pinned with the two highest-use tools. */
const DEFAULT_PINS = ['jar', 'bloom']

function ToolCard({
  tool,
  pinned,
  onTogglePin,
  showGrip = false,
}: {
  tool: Tool
  pinned: boolean
  onTogglePin: (id: string) => void
  showGrip?: boolean
}) {
  return (
    <Card as="article" variant="tile" padding="md" className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <span className={cx('pixel-tile flex size-12 items-center justify-center rounded-none', tool.tileClass)} aria-hidden="true">
          <Icon name={tool.icon} size={26} pixel />
        </span>
        {showGrip && (
          <span className="flex items-center gap-1 text-ink-soft" aria-hidden="true">
            <Icon name="grip" size={18} pixel />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="flex items-center gap-2 text-base font-extrabold text-ink">
          {tool.name}
          {tool.badge && <Chip tone="jar" className="pixel-chip">{tool.badge}</Chip>}
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{tool.tagline}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="md"
          variant="secondary"
          className="pixel-btn min-w-0 flex-1"
          leadingIcon={
            tool.external ? <Icon name="external" size={16} pixel /> : <Icon name="arrowRight" size={16} pixel />
          }
        >
          Open
        </Button>
        <IconButton
          icon="star"
          label={pinned ? `Unpin ${tool.name} from home` : `Pin ${tool.name} to home`}
          variant={pinned ? 'soft' : 'ghost'}
          filled={pinned}
          pixel
          aria-pressed={pinned}
          onClick={() => onTogglePin(tool.id)}
        />
      </div>
    </Card>
  )
}

/**
 * HUB TOOL CARDS — live hero visual + spec.
 * Pinned section up top (starred + draggable), full directory below.
 * The bloom card keeps bloom's own pink so the hand-off never feels like
 * leaving the product. Cards expose explicit actions — a dysregulated user
 * is never surprised by a whole-card tap.
 */
export function HubHero() {
  const [pins, setPins] = useState<string[]>(DEFAULT_PINS)

  const togglePin = (id: string) => {
    setPins((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]))
  }

  const pinnedTools = pins.map((id) => TOOLS.find((t) => t.id === id)!).filter(Boolean)
  const directoryTools = TOOLS.filter((t) => !pins.includes(t.id))

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card variant="raised" padding="lg" className="pixel-card flex-1">
        <div className="mb-4">
          <h3 className="font-display flex items-center gap-2 text-xl font-bold text-ink">
            <span className="pixel-tile flex size-10 items-center justify-center rounded-none bg-brand-100 text-brand-700 dark:bg-brand-300/20 dark:text-brand-300">
              <Icon name="home" size={22} pixel />
            </span>
            steady
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            Your toolbox, the tools you reach for most, at the top. Pin to reorder anytime.
          </p>
        </div>

        <section aria-labelledby="pinned-heading">
          <h4 id="pinned-heading" className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
            <Icon name="star" size={15} filled pixel />
            Pinned
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {pinnedTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} pinned onTogglePin={togglePin} showGrip />
            ))}
            {pinnedTools.length === 0 && (
              <p className="rounded-xl border border-dashed border-line p-4 text-sm text-ink-soft">
                Nothing pinned yet — tap the star on any tool to keep it at the top.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="directory-heading" className="mt-6">
          <h4 id="directory-heading" className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
            All tools
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {directoryTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} pinned={false} onTogglePin={togglePin} />
            ))}
          </div>
        </section>

        <p className="mt-5 flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-ink-soft">
          <Icon name="info" size={16} />
          Drag the grip to reorder (WP11). The star is how you pin.
        </p>
      </Card>

      <SpecPanel
        owner="WP5 · Hub + pinning"
        title="Hub tool cards & pin grid"
        className="lg:w-80 xl:w-96"
        sections={[
          {
            heading: 'Structure',
            items: [
              <span key="s1">
                Config-driven from <code>tools.config.ts</code>: {`{ id, name, tagline, accentToken, icon, route, pinnedByDefault }`}.
              </span>,
              <span key="s2">
                <strong>ToolCard</strong> = accent icon tile + name + tagline + <strong>Open</strong> (Button) + pin{' '}
                <strong>star</strong> (IconButton, <code>aria-pressed</code>). No whole-card tap — actions are explicit.
              </span>,
              <span key="s3">
                Pinned section is ordered by <code>steady_pins</code>; new users default to Energy Jar + bloom.
              </span>,
            ],
          },
          {
            heading: 'Per-tool accents',
            items: [
              <span key="a1">jar → honey <code>jar-*</code>, bloom → <code>bloom-*</code> (its own pink), timeline → sage <code>timeline-*</code>.</span>,
              <span key="a2">
                The bloom card renders in bloom's exact palette so opening the tracker in the same tab feels continuous.
              </span>,
              <span key="a3">
                Cards are plain containers — no invented colours, no clinical greys. Each tool keeps its own identity so
                the app never feels like “one gray app”.
              </span>,
            ],
          },
          {
            heading: 'Pin states & drag',
            items: [
              <span key="p1">Star: filled + soft when pinned, outlined when not; state announced by label change.</span>,
              <span key="p2">Drag grip appears on pinned cards (WP11 drag-to-reorder). Keyboard alternative: reorder buttons.</span>,
              <span key="p3">Pin state persists per-user (Supabase) and locally for guests via the repository.</span>,
            ],
          },
          {
            heading: 'Reduced motion',
            items: [
              <span key="r1">
                Pin/unpin re-renders in place (no flying cards). Hover lift uses <code>shadow-lift</code> + 1px translate —
                collapsed to a colour/shadow-only change by the kill-switch.
              </span>,
            ],
          },
        ]}
      />
    </div>
  )
}
