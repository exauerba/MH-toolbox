import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { Card, Chip, Icon, IconButton, Tooltip, usePrefersReducedMotion } from '../../design'
import type { ImageRef, TimelineEntry, TimelineZone } from '../../data/types'
import { formatDate, MONTHS } from './date'
import { useBreakpoint } from './useBreakpoint'
import type { Breakpoint } from './useBreakpoint'

const CARD_GAP = 16

// Proportional sizes per breakpoint (see docs/HANDOFF_AUTOSCALE.md). Cards
// show title + dates + zone chip + thumbnails (no description), so the
// worst-case height is the 44px IconButton header + dates + zone chip +
// 3×56px thumbnails + card padding. CARD_H is the collision-reserve height
// (matches the rendered content so the track hugs the cards instead of
// leaving dead space below them).
const SIZES: Record<Breakpoint, { CARD_W: number; CARD_H: number; TRACK_BASE_HEIGHT: number; DOT: number }> = {
  small: { CARD_W: 180, CARD_H: 200, TRACK_BASE_HEIGHT: 240, DOT: 16 },
  desktop: { CARD_W: 220, CARD_H: 210, TRACK_BASE_HEIGHT: 280, DOT: 16 },
  large: { CARD_W: 260, CARD_H: 220, TRACK_BASE_HEIGHT: 320, DOT: 18 },
}

function parseDate(iso: string): number {
  return Date.parse(`${iso}T00:00:00`)
}

function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b) - parseDate(a)) / 86_400_000)
}

/** Append an alpha channel to a 6-digit hex colour; leave anything else alone. */
function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex
}

export interface TimelineHorizontalProps {
  entries: TimelineEntry[]
  zones: TimelineZone[]
  imagesByEntry: Record<string, ImageRef[]>
  onOpenEntry: (entry: TimelineEntry) => void
  onEditEntry: (entry: TimelineEntry) => void
  onDeleteEntry: (entry: TimelineEntry) => void
}

/**
 * Horizontal timeline — a date-proportional track with zone bands, compact
 * markers and card entries. Scrollable by drag/swipe, arrow keys, arrow
 * buttons and jump-to-zone chips. Zone names are always shown (never
 * colour-alone); compact markers are real buttons with accessible names.
 */
export function TimelineHorizontal({
  entries,
  zones,
  imagesByEntry,
  onOpenEntry,
  onEditEntry,
  onDeleteEntry,
}: TimelineHorizontalProps) {
  const reduced = usePrefersReducedMotion()
  const bp = useBreakpoint()
  const { CARD_W, CARD_H, TRACK_BASE_HEIGHT, DOT } = SIZES[bp]
  const TOP_OFFSET = TRACK_BASE_HEIGHT / 2 + 28
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ startX: 0, startScroll: 0, active: false, moved: false })
  const [canScrollBack, setCanScrollBack] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)

  const scale = useMemo(() => {
    const starts = [...entries.map((e) => e.startDate), ...zones.map((z) => z.startDate)]
    const ends = [
      ...entries.map((e) => e.endDate ?? e.startDate),
      ...zones.map((z) => z.endDate ?? z.startDate),
    ]
    if (starts.length === 0) return { minDate: '', maxDate: '', pxPerDay: 96, trackWidth: 0 }
    const minDate = starts.reduce((a, b) => (a < b ? a : b))
    const maxDate = ends.reduce((a, b) => (a > b ? a : b))
    const daySpan = Math.max(1, diffDays(minDate, maxDate))
    const pxPerDay = Math.min(96, Math.max(12, Math.round(2400 / daySpan)))
    return { minDate, maxDate, pxPerDay, trackWidth: daySpan * pxPerDay }
  }, [entries, zones])

  const xFor = useCallback(
    (date: string) => diffDays(scale.minDate, date) * scale.pxPerDay,
    [scale.minDate, scale.pxPerDay],
  )

  const zoneForEntry = useCallback(
    (entry: TimelineEntry) =>
      zones.find(
        (zone) => entry.startDate >= zone.startDate && (zone.endDate === null || entry.startDate <= zone.endDate),
      ),
    [zones],
  )

  const cardLayout = useMemo(() => {
    const cards = entries
      .filter((e) => e.displayMode === 'card')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
    const placed: { left: number; right: number; top: number; bottom: number }[] = []
    return cards.map((entry) => {
      const left = xFor(entry.startDate)
      const right = left + CARD_W
      let top = TOP_OFFSET
      while (placed.some((p) => left < p.right && right > p.left && top < p.bottom && top + CARD_H > p.top)) {
        top += CARD_H + CARD_GAP
      }
      placed.push({ left, right, top, bottom: top + CARD_H })
      return { entry, left, top }
    })
  }, [entries, xFor, CARD_W, CARD_H, TOP_OFFSET])

  const trackHeight = useMemo(() => {
    const maxBottom = cardLayout.reduce((max, c) => Math.max(max, c.top + CARD_H), 0)
    return Math.max(TRACK_BASE_HEIGHT, maxBottom + 16)
  }, [cardLayout, CARD_H, TRACK_BASE_HEIGHT])

  // Month ruler — one tick per month start, aligned to the date-proportional
  // scale so it scrolls with the track. The year is shown on January and on
  // the first label, so the strip reads like a calendar.
  const rulerMonths = useMemo(() => {
    if (!scale.minDate) return []
    const months: { x: number; label: string }[] = []
    const start = new Date(`${scale.minDate}T00:00:00`)
    const end = new Date(`${scale.maxDate}T00:00:00`)
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    let first = true
    while (cursor <= end) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`
      const x = Math.max(0, diffDays(scale.minDate, iso) * scale.pxPerDay)
      if (x <= scale.trackWidth) {
        const isJanuary = cursor.getMonth() === 0
        months.push({
          x,
          label: `${MONTHS[cursor.getMonth()]}${isJanuary || first ? ` ${cursor.getFullYear()}` : ''}`,
        })
        first = false
      }
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return months
  }, [scale])

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollBack(el.scrollLeft > 0)
    setCanScrollForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    return () => {
      el.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [updateScrollState])

  // Re-evaluate arrow-button state when the track grows (e.g. an entry is
  // added) — no scroll event fires for a content-size change.
  useEffect(() => {
    updateScrollState()
  }, [updateScrollState, scale.trackWidth, trackHeight])

  const scrollTrackTo = useCallback(
    (left: number) => {
      const el = scrollRef.current
      if (!el) return
      if (reduced) {
        el.scrollLeft = left
      } else {
        try {
          el.scrollTo({ left, behavior: 'smooth' })
        } catch {
          el.scrollLeft = left
        }
      }
    },
    [reduced],
  )

  const scrollByAmount = useCallback(
    (direction: 1 | -1) => {
      const el = scrollRef.current
      if (!el) return
      scrollTrackTo(el.scrollLeft + direction * el.clientWidth * 0.8)
    },
    [scrollTrackTo],
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      scrollByAmount(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      scrollByAmount(1)
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    // Don't hijack presses on interactive children (markers, card buttons) —
    // capturing the pointer there would swallow their click events.
    if ((event.target as HTMLElement).closest('button, a, input, [role="button"]')) return
    dragState.current = { startX: event.clientX, startScroll: el.scrollLeft, active: true, moved: false }
    el.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    const drag = dragState.current
    if (!drag.active || !el) return
    const dx = event.clientX - drag.startX
    if (Math.abs(dx) > 5) drag.moved = true
    el.scrollLeft = drag.startScroll - dx
  }

  const endDrag = () => {
    dragState.current.active = false
  }

  if (scale.trackWidth === 0) return null

  return (
    <div className="flex flex-col gap-2 p-4 md:gap-3 md:p-5">
      {zones.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">Jump to</span>
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              aria-label={`Jump to ${zone.name}`}
              onClick={() => scrollTrackTo(xFor(zone.startDate))}
              className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-none border-2 border-line-strong bg-surface px-3.5 text-sm font-bold text-ink shadow-pixel-sm hover:bg-surface-muted"
            >
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: zone.color }} />
              {zone.name}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Scrollable region: role="region" + tabIndex makes the track keyboard-focusable (WCAG 2.1.1); arrow-key and pointer handlers are its interaction surface. */}
        <div
          ref={scrollRef}
          role="region"
          aria-label="Timeline"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative cursor-grab touch-pan-y overflow-x-auto overscroll-x-contain rounded-xl border border-line bg-surface-muted/50 active:cursor-grabbing"
        >
          <div className="relative" style={{ width: scale.trackWidth, height: trackHeight }}>
            {/* Zone bands — coloured strips with the zone name always shown */}
            {zones.map((zone) => {
              const left = xFor(zone.startDate)
              const zoneEnd = zone.endDate ?? scale.maxDate
              const width = Math.max(24, diffDays(zone.startDate, zoneEnd) * scale.pxPerDay)
              return (
                <div
                  key={zone.id}
                  className="absolute bottom-0 top-0"
                  style={{
                    left,
                    width,
                    backgroundColor: withAlpha(zone.color, '33'),
                    borderLeft: `3px solid ${zone.color}`,
                  }}
                >
                  <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-none border-2 border-line-strong bg-surface/90 px-2.5 py-1 text-xs font-bold text-ink shadow-pixel-sm">
                    <span className="size-2 rounded-[3px]" style={{ backgroundColor: zone.color }} />
                    {zone.name}
                  </span>
                </div>
              )
            })}

            {/* Centre line — dashed for a retro, hand-drawn feel */}
            <div
              className="absolute left-0 right-0 top-1/2 h-0 border-t-2 border-dashed border-ink-soft"
              aria-hidden="true"
            />

            {/* Compact markers — real buttons with accessible names */}
            {entries
              .filter((e) => e.displayMode === 'compact')
              .map((entry) => {
                const zone = zoneForEntry(entry)
                const left = xFor(entry.startDate)
                return (
                  <div key={entry.id} className="absolute" style={{ left, top: '50%' }}>
                    <div className="flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                      <span className="mb-1 whitespace-nowrap text-2xs font-semibold text-ink-faint">
                        {formatDate(entry.startDate)}
                      </span>
                      <Tooltip label={`${entry.title}, ${formatDate(entry.startDate)}`}>
                        <button
                          type="button"
                          aria-label={`${entry.title}, ${formatDate(entry.startDate)}`}
                          onClick={() => {
                            if (dragState.current.moved) return
                            onOpenEntry(entry)
                          }}
                          className="group relative block size-11 rounded-none transition-transform duration-[var(--dur-fast)] hover:scale-110 focus-visible:scale-110"
                        >
                          {/* Pixel dot inside a 44px touch target */}
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 m-auto rounded-[3px] border-2 bg-surface shadow-pixel-sm transition-transform duration-[var(--dur-fast)] group-hover:scale-125"
                            style={{ borderColor: zone?.color ?? entry.color, width: DOT, height: DOT }}
                          />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}

            {/* Card entries — stacked below the line, pushed down on collision.
                The whole card opens the read-only details view (a safe,
                non-destructive action); Edit/Delete stay explicit buttons. */}
            {cardLayout.map(({ entry, left, top }) => {
              const zone = zoneForEntry(entry)
              const images = imagesByEntry[entry.id] ?? []
              return (
                <div key={entry.id} className="absolute" style={{ left, top, width: CARD_W }}>
                  <Card
                    variant="soft"
                    padding="md"
                    className="group w-full cursor-pointer transition-shadow duration-[var(--dur-quick)] hover:shadow-lift focus-within:shadow-lift"
                  >
                    {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Whole-card click opens the read-only details view; Edit/Delete are explicit buttons that stopPropagation. */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for "${entry.title}"`}
                      onClick={() => onOpenEntry(entry)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onOpenEntry(entry)
                        }
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-base font-extrabold text-ink">{entry.title}</h4>
                        <span
                          aria-hidden="true"
                          className="text-ink-faint opacity-0 transition-opacity duration-[var(--dur-quick)] group-hover:opacity-100 group-focus-within:opacity-100"
                        >
                          <Icon name="chevronRight" size={16} pixel />
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink-soft">
                        <Icon name="calendar" size={14} pixel />
                        <time dateTime={entry.startDate}>{formatDate(entry.startDate)}</time>
                        {entry.endDate && (
                          <>
                            <span aria-hidden="true">→</span>
                            <time dateTime={entry.endDate}>{formatDate(entry.endDate)}</time>
                          </>
                        )}
                      </p>
                      {zone && (
                        <p className="mt-2">
                          <Chip tone="timeline" icon={<Icon name="flag" size={13} pixel />}>
                            {zone.name}
                          </Chip>
                        </p>
                      )}
                      {images.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          {images.slice(0, 3).map((ref) => (
                            <img
                              key={ref.id}
                              src={ref.url}
                              alt={entry.title}
                              className="h-14 w-14 rounded-md border border-line object-cover"
                            />
                          ))}
                          {images.length > 3 && (
                            <span className="flex h-14 w-14 items-center justify-center rounded-md border border-line bg-surface-muted text-xs font-bold text-ink-soft">
                              +{images.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <IconButton
                        icon="edit"
                        label={`Edit "${entry.title}"`}
                        variant="ghost"
                        pixel
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditEntry(entry)
                        }}
                      />
                      <IconButton
                        icon="trash"
                        label={`Delete "${entry.title}"`}
                        variant="ghost"
                        pixel
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteEntry(entry)
                        }}
                      />
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
          {/* Month ruler — subtle calendar strip anchoring the date scale */}
          <div
            aria-hidden="true"
            className="relative h-7 border-t border-line"
            style={{ width: scale.trackWidth }}
          >
            {rulerMonths.map((m) => (
              <div key={`${m.label}-${m.x}`} className="absolute top-0" style={{ left: m.x }}>
                <span className="absolute top-0 h-1.5 w-px bg-line-strong" />
                <span
                  className={`absolute top-2 whitespace-nowrap text-xs font-semibold text-ink-soft ${
                    m.x > 0 ? '-translate-x-1/2' : ''
                  }`}
                >
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */}

        <IconButton
          icon="chevronLeft"
          label="Scroll timeline back"
          variant="soft"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2"
          disabled={!canScrollBack}
          onClick={() => scrollByAmount(-1)}
        />
        <IconButton
          icon="chevronRight"
          label="Scroll timeline forward"
          variant="soft"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2"
          disabled={!canScrollForward}
          onClick={() => scrollByAmount(1)}
        />
      </div>
    </div>
  )
}