import { useState } from 'react'
import { Button, Card, Chip, EmptyState, IconButton, SegmentedControl, Toggle } from '../primitives'
import { Icon } from '../icons'
import { SpecPanel } from './SpecPanel'
import { cx } from '../cx'
import { zonePalette } from '../tokens'

interface Zone {
  id: string
  name: string
  color: string
  from: number // index into ENTRIES
  to: number // inclusive
}

interface Entry {
  id: string
  title: string
  date: string
  period?: string
  description: string
  zoneId: string
  image?: boolean
}

const ENTRIES: Entry[] = [
  {
    id: 'e1',
    title: 'First day at the new job',
    date: '2026-01-06',
    description: 'Nervous in the morning, but the team was kind. I took two breaks.',
    zoneId: 'z1',
  },
  {
    id: 'e2',
    title: 'Moved into my own place',
    date: '2026-02-14',
    description: 'Painted the wall sage. It finally feels like mine.',
    zoneId: 'z1',
    image: true,
  },
  {
    id: 'e3',
    title: 'Three weeks of burnout',
    date: '2026-03-02',
    period: '2026-03-20',
    description: 'Everything felt heavy. I slept a lot and cancelled plans. I started telling people no.',
    zoneId: 'z2',
  },
  {
    id: 'e4',
    title: 'Told a friend about the jar',
    date: '2026-04-10',
    description: 'She understood right away. It helped to say it out loud.',
    zoneId: 'z3',
  },
  {
    id: 'e5',
    title: 'Long weekend at the coast',
    date: '2026-05-30',
    period: '2026-06-02',
    description: 'Slow mornings, salt air, no phone. Came back lighter.',
    zoneId: 'z3',
    image: true,
  },
]

const ZONES: Zone[] = [
  { id: 'z1', name: 'Regulated', color: zonePalette.sage, from: 0, to: 1 },
  { id: 'z2', name: 'Overflow', color: zonePalette.clay, from: 2, to: 2 },
  { id: 'z3', name: 'Recovering', color: zonePalette.sky, from: 3, to: 4 },
]

const ZONE_SETS: Record<'regained' | 'shutdown', Zone[]> = {
  regained: ZONES,
  shutdown: [
    { id: 'z1', name: 'Regulated', color: zonePalette.sage, from: 0, to: 0 },
    { id: 'z2', name: 'Shutdown', color: zonePalette.lavender, from: 1, to: 2 },
    { id: 'z3', name: 'Slow return', color: zonePalette.honey, from: 3, to: 4 },
  ],
}

/**
 * PERSONAL TIMELINE — live hero visual + spec.
 * A vertical spine with user-defined zone bands and entry cards. Zones are
 * coloured strips whose NAME is always shown (never colour-alone); entries
 * carry title, date, zone tag, description and optional images.
 */
export function TimelineHero({ spec = true }: { spec?: boolean }) {
  const [view, setView] = useState<'regained' | 'shutdown'>('regained')
  const [empty, setEmpty] = useState(false)
  const zones = ZONE_SETS[view]

  const zoneById = (id: string) => zones.find((z) => z.id === id)

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card variant="raised" padding="none" className="flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-extrabold text-ink">
              <span className="flex size-10 items-center justify-center rounded-full bg-timeline-100 text-timeline-700 dark:bg-timeline-300/20 dark:text-timeline-300">
                <Icon name="timeline" size={22} />
              </span>
              My timeline
            </h3>
            <p className="mt-1 text-sm text-ink-soft">Zones you define — your words, your colours.</p>
          </div>
          <div className="flex flex-col gap-2">
            <SegmentedControl
              label="Demo zone set"
              value={view}
              onChange={(v) => setView(v as 'regained' | 'shutdown')}
              options={[
                { value: 'regained', label: 'Nervous-system zones' },
                { value: 'shutdown', label: 'Life chapters' },
              ]}
              className="max-w-72"
            />
            <Toggle
              checked={empty}
              onChange={setEmpty}
              label="Show empty state"
              ariaLabel="Toggle empty timeline state"
            />
          </div>
        </div>

        {/* Zone legend */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          <span className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">Zones</span>
          {zones.map((zone) => (
            <Chip key={zone.id} icon={<span className="size-2.5 rounded-full" style={{ backgroundColor: zone.color }} />}>
              {zone.name}
            </Chip>
          ))}
        </div>

        {/* Timeline body */}
        {empty ? (
          <EmptyState
            icon="timeline"
            title="Nothing here yet"
            body="Your timeline starts empty on purpose. When you're ready, add a moment — a place, a person, a turning point."
            action={
              <Button variant="secondary" leadingIcon={<Icon name="plus" size={18} />}>
                Add your first entry
              </Button>
            }
          />
        ) : (
          <ol className="flex flex-col gap-0 p-5">
            {ENTRIES.map((entry, index) => {
              const zone = zoneById(entry.zoneId)
              const inZone = zones.some((z) => z.from <= index && index <= z.to)
              return (
                <li key={entry.id} className={cx('relative flex gap-4 pb-8', index === ENTRIES.length - 1 && 'pb-0')}>
                  {/* Spine */}
                  <span className="relative flex w-8 shrink-0 flex-col items-center">
                    <span
                      className="mt-3 size-4 rounded-full border-2 bg-surface"
                      style={{ borderColor: zone?.color }}
                    />
                    {index < ENTRIES.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-line-strong" aria-hidden="true" />
                    )}
                  </span>

                  {/* Zone band behind the entry */}
                  {inZone && zone && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 right-0 w-1.5 rounded-full"
                      style={{ backgroundColor: zone.color }}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <Card variant="soft" padding="md" className="w-full">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-base font-extrabold text-ink">{entry.title}</h4>
                        <div className="flex items-center gap-1">
                          <IconButton icon="edit" label={`Edit “${entry.title}”`} variant="ghost" />
                          <IconButton icon="trash" label={`Delete “${entry.title}”`} variant="ghost" />
                        </div>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                        <Icon name="calendar" size={14} />
                        <time dateTime={entry.date}>{entry.date}</time>
                        {entry.period && (
                          <>
                            <span aria-hidden="true">→</span>
                            <time dateTime={entry.period}>{entry.period}</time>
                          </>
                        )}
                      </p>
                      {zone && (
                        <p className="mt-2">
                          <Chip tone="timeline" icon={<Icon name="flag" size={13} />}>
                            {zone.name}
                          </Chip>
                        </p>
                      )}
                      <p className="mt-2 text-base leading-relaxed text-ink">{entry.description}</p>
                      {entry.image && (
                        <div
                          className="mt-3 flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-timeline-300 bg-timeline-50 text-timeline-700 dark:bg-timeline-300/10 dark:text-timeline-300"
                          role="img"
                          aria-label={`Photo attached to “${entry.title}”`}
                        >
                          <Icon name="image" size={22} />
                          <span className="text-sm font-bold">Photo</span>
                        </div>
                      )}
                    </Card>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Card>

      {spec && (
        <SpecPanel
          owner="WP9 · Personal Timeline"
        title="Timeline zones & entry rendering"
        className="lg:w-80 xl:w-96"
        sections={[
          {
            heading: 'Structure',
            items: [
              <span key="s1">
                Vertical <code>&lt;ol&gt;</code> spine. Each row = date node (coloured by zone) + <strong>EntryCard</strong>{' '}
                + zone edge-bar.
              </span>,
              <span key="s2">
                <strong>ZoneBand</strong>: user-defined {`{ name, color, start, end }`} rendered as a coloured
                edge-strip spanning its date range, with a legend chip and the zone name always shown.
              </span>,
              <span key="s3">
                EntryCard fields: title (≤80), date range (<code>&lt;time&gt;</code>), zone tag, description, up to 5
                images.
              </span>,
            ],
          },
          {
            heading: 'Tokens',
            items: [
              <span key="t1">Timeline accent: <code>timeline-*</code> (sage).</span>,
              <span key="t2">
                Zone colours come from the curated <code>zonePalette</code> in tokens.ts — every swatch passes AA text
                contrast on canvas and is shown with its name.
              </span>,
              <span key="t3">
                Users pick their own labels + colours (no fixed clinical set). New swatches must be validated against{' '}
                <code>zonePalette</code> or pass the same contrast check.
              </span>,
            ],
          },
          {
            heading: 'States',
            items: [
              <span key="e1">Empty → EmptyState with one clear action (“Add your first entry”).</span>,
              <span key="e2">Entry edit/delete via IconButtons on the card; date edits reorder by {`(start_date, created_at)`}.</span>,
              <span key="e3">
                Images: warm dashed placeholder, jpeg/png/webp ≤5MB, ≤5 per entry; device-local for guests, Storage for
                signed-in.
              </span>,
            ],
          },
          {
            heading: 'Reduced motion',
            items: [
              <span key="r1">
                The timeline is still by default — entries render in place (no fly-ins). Optional <code>fade-in</code>{' '}
                is collapsed by the global kill-switch.
              </span>,
            ],
          },
          {
            heading: 'Accessibility',
            items: [
              <span key="a1">
                Colour never alone: every zone is named, every entry shows its zone tag, dates use <code>&lt;time&gt;</code>.
              </span>,
              <span key="a2">Full keyboard CRUD; focus-visible rings on every control.</span>,
              <span key="a3">Sensitive by default — nothing on this screen is shared anywhere.</span>,
            ],
          },
        ]}
        />
      )}
    </div>
  )
}
