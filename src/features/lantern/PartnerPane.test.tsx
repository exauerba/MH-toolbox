import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { currentLevelExpiresAt } from '../../data/lanternTtl'
import type { LanternLevel, PartnerStatus } from '../../data/types'
import { CRISIS_REGIONS, DEFAULT_CRISIS_REGION_ID } from '../../shared/crisis'
import { PartnerPane } from './PartnerPane'

type PaneCurrent = NonNullable<PartnerStatus['currentLevel']>

const MIN = 60_000

const level = (position: number, label: string): LanternLevel => ({
  id: `l${position}`,
  position,
  label,
  description: `${label} desc`,
  actions: [`help at ${label}`],
})

// Three levels, never two: `isCrisisLevel` flags the top TWO levels, so on a
// 2-level scale both are crisis and single-match queries collide.
const LEVELS = [level(1, 'Steady'), level(2, 'Stretched'), level(3, 'At the edge')]

function currentFor(l: LanternLevel, setAt: Date, expiresAt: Date): PaneCurrent {
  return {
    id: 'cur-1',
    levelId: l.id,
    setAt: setAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    position: l.position,
    label: l.label,
    description: l.description,
    actions: l.actions,
  }
}

/** A level set inside the 60-minute window, so the live countdown is certain. */
const liveCurrent = (l: LanternLevel) =>
  currentFor(l, new Date(Date.now() - 5 * MIN), new Date(currentLevelExpiresAt(new Date())))

/** A level set three hours ago and timed out two hours ago. */
const settledCurrent = (l: LanternLevel) =>
  currentFor(l, new Date(Date.now() - 3 * 60 * MIN), new Date(Date.now() - 2 * 60 * MIN))

function status(over: Partial<PartnerStatus> = {}): PartnerStatus {
  return {
    sharerId: 'u-sam',
    sharerUsername: 'Sam',
    scaleName: "Sam's Lantern",
    levelCount: LEVELS.length,
    levels: LEVELS,
    currentLevel: null,
    ...over,
  }
}

function renderPane(over: Partial<PartnerStatus> = {}, onRefresh = vi.fn()) {
  return render(<PartnerPane status={status(over)} onRefresh={onRefresh} />)
}

describe('PartnerPane', () => {
  it('leads with the person, not the number, when a high level is live', () => {
    renderPane({ currentLevel: liveCurrent(LEVELS[1]) })

    const headline = screen.getByRole('heading', { name: /may need you right now/ })
    expect(headline).toHaveTextContent('Sam may need you right now.')
    // The name is the headline's subject, and the headline is never the bare
    // numeral on its own — the number stays secondary.
    expect(headline).toHaveTextContent('Sam')
    expect(headline.textContent?.trim()).not.toMatch(/^\d+$/)
    expect(screen.getAllByText('Sam').length).toBeGreaterThan(0)
    // The label still names the moment, next to its position.
    expect(screen.getAllByText('Stretched').length).toBeGreaterThan(0)
  })

  it('stays plain and factual when the live level is a calm one', () => {
    renderPane({ currentLevel: liveCurrent(LEVELS[0]) })

    expect(screen.getByRole('heading', { name: /is at level 1/ })).toBeInTheDocument()
    expect(screen.queryByText('This is a crisis level. Stay close.')).not.toBeInTheDocument()
  })

  it('shows a settled, un-alarmed pane once the level has expired', () => {
    renderPane({ currentLevel: settledCurrent(LEVELS[0]) })

    expect(screen.getByRole('heading', { name: /last update has settled/i })).toBeInTheDocument()
    // The note explains WHY it is quiet, instead of restating an old level.
    expect(screen.getByText(/Levels settle after an hour/)).toBeInTheDocument()
    expect(screen.getByText(/This is what was true then/)).toBeInTheDocument()
    expect(screen.getByText(/^Last updated \dh ago$/)).toBeInTheDocument()
  })

  it('does not paint a stale value with alarm styling', () => {
    renderPane({ currentLevel: settledCurrent(LEVELS[0]) })

    const pane = screen.getByRole('region', { name: "Sam's lantern" })
    // Tone classes are the only channel the pane has for "this is an alarm",
    // so assert on the panel and the numeral badge carrying none of them.
    expect(pane.className).not.toMatch(/error|warning/)
    expect(pane.querySelector('span.tabular-nums')?.className).not.toMatch(/error|warning/)
    expect(screen.queryByText('This is a crisis level. Stay close.')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /988/ })).not.toBeInTheDocument()
  })

  it('never raises the alarm on a crisis level that has already settled', () => {
    // The sharpest case: a position that IS a crisis while live, but whose
    // window closed. Re-firing the crisis callout on a stale reading is exactly
    // the alarm fatigue the pane exists to avoid, so urgency has to be derived
    // from liveness, not from position alone.
    renderPane({ currentLevel: settledCurrent(LEVELS[2]) })

    const pane = screen.getByRole('region', { name: "Sam's lantern" })
    expect(screen.getByRole('heading', { name: "Sam's last update has settled." })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /may need you right now/ })).not.toBeInTheDocument()
    expect(pane.className).not.toMatch(/error|warning/)
    expect(pane.querySelector('span.tabular-nums')?.className).not.toMatch(/error|warning/)
    expect(screen.queryByText('This is a crisis level. Stay close.')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /988/ })).not.toBeInTheDocument()
    // The level's own words still read, so the partner has context for what was
    // true — just not as a fresh alarm.
    expect(screen.getByText(/Last updated/)).toBeInTheDocument()
  })

  it('says so plainly when no level has been set yet', () => {
    renderPane()

    expect(screen.getByRole('heading', { name: "Sam hasn't set a level yet." })).toBeInTheDocument()
  })

  it('renders the crisis resources as links on a crisis level', () => {
    const region =
      CRISIS_REGIONS.find((r) => r.id === DEFAULT_CRISIS_REGION_ID) ?? CRISIS_REGIONS[0]
    renderPane({ currentLevel: liveCurrent(LEVELS[2]) })

    expect(screen.getByText('This is a crisis level. Stay close.')).toBeInTheDocument()
    for (const resource of region.resources) {
      expect(screen.getByRole('link', { name: resource.name })).toHaveAttribute(
        'href',
        resource.href,
      )
    }
  })

  it('offers no way to reply — the pane is read-only', () => {
    renderPane({ currentLevel: liveCurrent(LEVELS[2]) })

    // Pinned on purpose: presence, not problem-solving. If a reply affordance
    // is ever added, this test should fail so the decision is re-made.
    for (const name of [/i'm here/i, /check in/i, /nudge/i, /respond/i, /reply/i]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(document.querySelector('textarea')).not.toBeInTheDocument()
    // Refresh is the only control the pane hands a partner.
    expect(screen.getAllByRole('button').map((b) => b.textContent?.trim())).toEqual(['Refresh'])
  })

  it('keeps the whole scale behind a collapsed disclosure', () => {
    const { container } = renderPane()

    const details = container.querySelector('details')
    expect(details).toBeInTheDocument()
    expect(details?.querySelector('summary')).toHaveTextContent("See Sam's whole scale")
    expect(screen.getByText('Steady')).toBeInTheDocument()
    expect(screen.getByText('Stretched')).toBeInTheDocument()
    expect(screen.getByText('At the edge')).toBeInTheDocument()
  })

  it('re-reads the partnership when refresh is pressed', () => {
    const onRefresh = vi.fn()
    renderPane({ currentLevel: liveCurrent(LEVELS[0]) }, onRefresh)

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
