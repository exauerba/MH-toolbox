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
})