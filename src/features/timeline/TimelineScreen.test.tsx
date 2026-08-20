import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RepositoryProvider } from '../../data/RepositoryProvider'
import { FakeRepository } from '../../data/testing/fakeRepository'
import { zonePalette } from '../../design'
import { TimelineScreen } from './TimelineScreen'

function renderScreen(repo: FakeRepository) {
  render(
    <MemoryRouter>
      <RepositoryProvider initialRepo={repo}>
        <TimelineScreen />
      </RepositoryProvider>
    </MemoryRouter>,
  )
}

const baseProfile = {
  theme: 'system' as const,
  jarDefaultSpoons: 12,
  jarResetHour: 0,
  onboardingDone: true,
  localDataImportedAt: null,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TimelineScreen', () => {
  it('shows the empty state with one clear action when there is nothing yet', async () => {
    renderScreen(new FakeRepository())

    expect(await screen.findByText('Nothing here yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your first entry' })).toBeInTheDocument()
  })

  it('renders entries in startDate order', async () => {
    const repo = new FakeRepository()
    await repo.saveTimelineEntry({ title: 'Middle', startDate: '2025-06-01', color: zonePalette.sage })
    await repo.saveTimelineEntry({ title: 'Latest', startDate: '2026-01-10', color: zonePalette.sky })
    await repo.saveTimelineEntry({ title: 'Earliest', startDate: '2025-01-01', color: zonePalette.clay })
    renderScreen(repo)

    const rows = await screen.findAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByText('Earliest')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Middle')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Latest')).toBeInTheDocument()
  })

  it('adds an entry through the modal', async () => {
    const repo = new FakeRepository()
    renderScreen(repo)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Add your first entry' }))
    await user.type(await screen.findByLabelText(/Title/), 'First real entry')
    fireEvent.change(screen.getByLabelText(/^Start date/), { target: { value: '2026-02-14' } })
    await user.click(screen.getByRole('button', { name: 'Colour clay' }))
    await user.click(screen.getByRole('button', { name: 'Save entry' }))

    expect(await screen.findByText('First real entry')).toBeInTheDocument()
    const list = await repo.listTimelineEntries()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      title: 'First real entry',
      startDate: '2026-02-14',
      color: zonePalette.clay,
    })
  })

  it('edits an entry in place, keeping its id', async () => {
    const repo = new FakeRepository()
    const entry = await repo.saveTimelineEntry({
      title: 'Old title',
      startDate: '2025-01-01',
      description: 'Before.',
      color: zonePalette.sage,
    })
    renderScreen(repo)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Edit "Old title"' }))
    const titleInput = screen.getByLabelText(/Title/)
    expect(titleInput).toHaveValue('Old title')
    await user.clear(titleInput)
    await user.type(titleInput, 'New title')
    await user.click(screen.getByRole('button', { name: 'Save entry' }))

    expect(await screen.findByText('New title')).toBeInTheDocument()
    const list = await repo.listTimelineEntries()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(entry.id)
    expect(list[0].title).toBe('New title')
  })

  it('deletes an entry after confirmation', async () => {
    const repo = new FakeRepository()
    await repo.saveTimelineEntry({ title: 'Doomed entry', startDate: '2025-05-05', color: zonePalette.sky })
    renderScreen(repo)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Delete "Doomed entry"' }))
    await user.click(await screen.findByRole('button', { name: 'Delete entry' }))

    await waitFor(() => expect(screen.queryByText('Doomed entry')).not.toBeInTheDocument())
    expect(await repo.listTimelineEntries()).toHaveLength(0)
  })

  it('supports full zone CRUD, including the edge band on matching entries', async () => {
    const repo = new FakeRepository()
    await repo.saveTimelineEntry({ title: 'Beach trip', startDate: '2025-07-10', color: zonePalette.sage })
    await repo.saveTimelineEntry({ title: 'Winter', startDate: '2026-01-10', color: zonePalette.sage })
    renderScreen(repo)
    const user = userEvent.setup()

    // Add a zone that covers the beach trip but not winter.
    await user.click(await screen.findByRole('button', { name: 'Add zone' }))
    await user.type(await screen.findByLabelText(/Name/), 'Summer')
    fireEvent.change(screen.getByLabelText(/^Start date/), { target: { value: '2025-07-01' } })
    fireEvent.change(screen.getByLabelText(/^End date/), { target: { value: '2025-12-31' } })
    await user.click(screen.getByRole('button', { name: 'Colour sky' }))
    await user.click(screen.getByRole('button', { name: 'Save zone' }))

    await waitFor(() => expect(screen.getAllByText('Summer').length).toBeGreaterThan(0))
    const beachRow = screen.getByText('Beach trip').closest('li')
    const winterRow = screen.getByText('Winter').closest('li')
    expect(beachRow?.querySelector('[data-zone-band="true"]')).not.toBeNull()
    expect(winterRow?.querySelector('[data-zone-band="true"]')).toBeNull()
    expect(await repo.listZones()).toHaveLength(1)

    // Edit the zone name.
    await user.click(screen.getByRole('button', { name: 'Edit zone "Summer"' }))
    const nameInput = screen.getByLabelText(/Name/)
    expect(nameInput).toHaveValue('Summer')
    await user.clear(nameInput)
    await user.type(nameInput, 'Warm')
    await user.click(screen.getByRole('button', { name: 'Save zone' }))

    await waitFor(() => expect(screen.getAllByText('Warm').length).toBeGreaterThan(0))
    expect(screen.queryAllByText('Summer')).toHaveLength(0)

    // Delete the zone.
    await user.click(screen.getByRole('button', { name: 'Edit zone "Warm"' }))
    await user.click(screen.getByRole('button', { name: 'Delete zone' }))

    await waitFor(() => expect(screen.queryAllByText('Warm')).toHaveLength(0))
    expect(await repo.listZones()).toHaveLength(0)
  })

  it('renders an attached image and removes it on demand', async () => {
    const repo = new FakeRepository()
    const entry = await repo.saveTimelineEntry({
      title: 'Moved home',
      startDate: '2025-03-01',
      color: zonePalette.sage,
    })
    const ref = await repo.uploadImage(new File(['x'], 'a.png', { type: 'image/png' }), entry.id)
    renderScreen(repo)
    const user = userEvent.setup()

    const img = await screen.findByRole('img', { name: 'Moved home' })
    expect(img).toHaveAttribute('src', ref.url)

    await user.click(screen.getByRole('button', { name: 'Remove photo from "Moved home"' }))

    await waitFor(() =>
      expect(screen.queryByRole('img', { name: 'Moved home' })).not.toBeInTheDocument(),
    )
    expect(await repo.listImages(entry.id)).toHaveLength(0)
  })

  it('persists the orientation choice to the profile', async () => {
    const repo = new FakeRepository()
    renderScreen(repo)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('radio', { name: 'Horizontal' }))

    await waitFor(async () => {
      const profile = await repo.getProfile()
      expect(profile?.timelineOrientation).toBe('horizontal')
    })
  })

  it('renders the horizontal timeline when the profile prefers it', async () => {
    const repo = new FakeRepository()
    await repo.setProfile({ ...baseProfile, timelineOrientation: 'horizontal' })
    await repo.saveTimelineEntry({ title: 'First day', startDate: '2026-01-05', color: zonePalette.sage })
    renderScreen(repo)

    expect(await screen.findByRole('region', { name: 'Timeline' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Horizontal/ })).toBeChecked()
  })

  it('defaults new entries to card display mode', async () => {
    const repo = new FakeRepository()
    renderScreen(repo)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Add your first entry' }))
    await user.type(await screen.findByLabelText(/Title/), 'Card entry')
    fireEvent.change(screen.getByLabelText(/^Start date/), { target: { value: '2026-03-01' } })
    await user.click(screen.getByRole('button', { name: 'Save entry' }))

    const list = await repo.listTimelineEntries()
    expect(list[0].displayMode).toBe('card')
  })

  it('renders compact entries as markers that open a read-only view with edit', async () => {
    const repo = new FakeRepository()
    await repo.setProfile({ ...baseProfile, timelineOrientation: 'horizontal' })
    renderScreen(repo)
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Add entry' }))
    await user.type(await screen.findByLabelText(/Title/), 'Quiet moment')
    fireEvent.change(screen.getByLabelText(/^Start date/), { target: { value: '2026-04-10' } })
    await user.click(screen.getByRole('radio', { name: 'Compact' }))
    await user.click(screen.getByRole('button', { name: 'Save entry' }))

    const list = await repo.listTimelineEntries()
    expect(list[0].displayMode).toBe('compact')

    // Compact entries render as a marker button, not a card.
    const marker = await screen.findByRole('button', { name: 'Quiet moment, 10 Apr 2026' })
    await user.click(marker)

    // Read-only view: title shown, no editable inputs.
    expect(await screen.findByRole('heading', { name: 'Quiet moment' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/Title/)).not.toBeInTheDocument()

    // Edit switches to the form, where display mode can be changed back.
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(await screen.findByLabelText(/Title/)).toHaveValue('Quiet moment')
    await user.click(screen.getByRole('radio', { name: 'Card' }))
    await user.click(screen.getByRole('button', { name: 'Save entry' }))

    await waitFor(async () => {
      const updated = await repo.listTimelineEntries()
      expect(updated[0].displayMode).toBe('card')
    })
  })

  it('shows zone bands and jump chips in horizontal mode', async () => {
    const repo = new FakeRepository()
    await repo.setProfile({ ...baseProfile, timelineOrientation: 'horizontal' })
    await repo.saveTimelineEntry({ title: 'Beach trip', startDate: '2025-07-10', color: zonePalette.sage })
    await repo.saveZone({ name: 'Summer', color: zonePalette.sky, startDate: '2025-07-01', endDate: '2025-12-31' })
    renderScreen(repo)

    expect(await screen.findByRole('region', { name: 'Timeline' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Jump to Summer' })).toBeInTheDocument()
    expect(screen.getAllByText('Summer').length).toBeGreaterThan(0)
  })

  it('shows a month ruler along the bottom of the horizontal track', async () => {
    const repo = new FakeRepository()
    await repo.setProfile({ ...baseProfile, timelineOrientation: 'horizontal' })
    await repo.saveTimelineEntry({ title: 'Beach trip', startDate: '2025-07-10', color: zonePalette.sage })
    await repo.saveTimelineEntry({ title: 'Quiet moment', startDate: '2025-09-15', color: zonePalette.sage })
    renderScreen(repo)

    expect(await screen.findByRole('region', { name: 'Timeline' })).toBeInTheDocument()
    // The scale spans Jul–Sep 2025: the first label carries the year, later
    // months are bare, and the year repeats on January.
    expect(screen.getByText('Jul 2025')).toBeInTheDocument()
    expect(screen.getByText('Aug')).toBeInTheDocument()
    expect(screen.getByText('Sep')).toBeInTheDocument()
  })

  it('scrolls the horizontal track with the arrow buttons and arrow keys', async () => {
    const repo = new FakeRepository()
    await repo.setProfile({ ...baseProfile, timelineOrientation: 'horizontal' })
    await repo.saveTimelineEntry({ title: 'First day', startDate: '2026-01-05', color: zonePalette.sage })
    renderScreen(repo)
    const user = userEvent.setup()

    const region = await screen.findByRole('region', { name: 'Timeline' })
    Object.defineProperty(region, 'scrollWidth', { configurable: true, value: 2000 })
    Object.defineProperty(region, 'clientWidth', { configurable: true, value: 500 })
    fireEvent.scroll(region)

    const forward = screen.getByRole('button', { name: 'Scroll timeline forward' })
    await waitFor(() => expect(forward).toBeEnabled())
    await user.click(forward)
    expect(region.scrollLeft).toBeGreaterThan(0)

    fireEvent.keyDown(region, { key: 'ArrowRight' })
    expect(region.scrollLeft).toBeGreaterThan(0)
  })
})