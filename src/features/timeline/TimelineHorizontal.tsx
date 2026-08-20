import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { Card, Chip, Icon, IconButton, Tooltip, usePrefersReducedMotion } from '../../design'
import type { ImageRef, TimelineEntry, TimelineZone } from '../../data/types'
import { formatDate } from './date'

const CARD_W = 256
// Worst-case card height: 44px IconButton header + dates + zone chip +
// 3-line description + 3×56px thumbnails + card padding.
const CARD_H = 300
const CARD_GAP = 16
const TRACK_BASE_HEIGHT = 400
const TOP_OFFSET = TRACK_BASE_HEIGHT / 2 + 28

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
  }, [entries, xFor])

  const trackHeight = useMemo(() => {
    const maxBottom = cardLayout.reduce((max, c) => Math.max(max, c.top + CARD_H), 0)
    return Math.max(TRACK_BASE_HEIGHT, maxBottom + 16)
  }, [cardLayout])

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
    <div className="flex flex-col gap-3 p-5">
      {zones.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">Jump to</span>
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              aria-label={`Jump to ${zone.name}`}
              onClick={() => scrollTrackTo(xFor(zone.startDate))}
              className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 text-sm font-bold text-ink shadow-soft hover:bg-surface-muted"
            >
              <span className="size-2.5 rounded-full" style={{ backgroundColor: zone.color }} />
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
                  <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-bold text-ink shadow-soft">
                    <span className="size-2 rounded-full" style={{ backgroundColor: zone.color }} />
                    {zone.name}
                  </span>
                </div>
              )
            })}

            {/* Centre line */}
            <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-line-strong" aria-hidden="true" />

            {/* Compact markers — real buttons with accessible names */}
            {entries
              .filter((e) => e.displayMode === 'compact')
              .map((entry) => {
                const zone = zoneForEntry(entry)
                const left = xFor(entry.startDate)
                return (
                  <div key={entry.id} className="absolute" style={{ left, top: '50%' }}>
                    <Tooltip label={`${entry.title}, ${formatDate(entry.startDate)}`}>
                      <button
                        type="button"
                        aria-label={`${entry.title}, ${formatDate(entry.startDate)}`}
                        onClick={() => {
                          if (dragState.current.moved) return
                          onOpenEntry(entry)
                        }}
                        className="group relative block size-11 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-[var(--dur-fast)] hover:scale-110 focus-visible:scale-110"
                      >
                        {/* 16px visual dot inside a 44px touch target */}
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 m-auto size-4 rounded-full border-2 bg-surface transition-transform duration-[var(--dur-fast)] group-hover:scale-125"
                          style={{ borderColor: zone?.color ?? entry.color }}
                        />
                      </button>
                    </Tooltip>
                  </div>
                )
              })}

            {/* Card entries — stacked below the line, pushed down on collision */}
            {cardLayout.map(({ entry, left, top }) => {
              const zone = zoneForEntry(entry)
              const images = imagesByEntry[entry.id] ?? []
              return (
                <div key={entry.id} className="absolute" style={{ left, top, width: CARD_W }}>
                  <Card variant="soft" padding="md" className="w-full">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-base font-extrabold text-ink">{entry.title}</h4>
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon="edit"
                          label={`Edit "${entry.title}"`}
                          variant="ghost"
                          pixel
                          onClick={() => onEditEntry(entry)}
                        />
                        <IconButton
                          icon="trash"
                          label={`Delete "${entry.title}"`}
                          variant="ghost"
                          pixel
                          onClick={() => onDeleteEntry(entry)}
                        />
                      </div>
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
                    {entry.description && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink">{entry.description}</p>
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
                  </Card>
                </div>
              )
            })}
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