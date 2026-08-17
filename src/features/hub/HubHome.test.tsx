import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepositoryProvider } from '../../data/RepositoryProvider'
import { FakeRepository } from '../../data/testing/fakeRepository'
import { HubHome } from './HubHome'

function renderHub(fake: FakeRepository) {
  return render(
    <MemoryRouter>
      <RepositoryProvider initialRepo={fake}>
        <HubHome />
      </RepositoryProvider>
    </MemoryRouter>,
  )
}

describe('HubHome', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders pinned and directory sections', async () => {
    const fake = new FakeRepository()
    fake.pins = ['jar']
    renderHub(fake)

    const allTools = screen.getByRole('region', { name: 'All tools' })
    await within(allTools).findByText('Mood & Symptom Tracker')

    const pinned = screen.getByRole('region', { name: 'Your tools' })
    expect(within(pinned).getByText('Energy Jar')).toBeInTheDocument()
    expect(within(pinned).queryByText('Mood & Symptom Tracker')).not.toBeInTheDocument()
    expect(within(allTools).getByText('Mood & Symptom Tracker')).toBeInTheDocument()
    expect(within(allTools).getByText('Personal Timeline')).toBeInTheDocument()
    expect(within(allTools).getByText('More tools soon')).toBeInTheDocument()
  })

  it('toggle pin moves a card between sections', async () => {
    const fake = new FakeRepository()
    fake.pins = ['jar']
    renderHub(fake)

    const allTools = screen.getByRole('region', { name: 'All tools' })
    await within(allTools).findByText('Mood & Symptom Tracker')

    fireEvent.click(
      within(allTools).getByRole('button', { name: 'Pin Mood & Symptom Tracker to home' }),
    )

    const pinned = screen.getByRole('region', { name: 'Your tools' })
    expect(await within(pinned).findByText('Mood & Symptom Tracker')).toBeInTheDocument()

    await waitFor(async () => {
      expect(await fake.getPins()).toContain('bloom')
    })
  })

  it('up/down buttons reorder', async () => {
    const fake = new FakeRepository()
    fake.pins = ['jar', 'bloom']
    renderHub(fake)

    const pinned = screen.getByRole('region', { name: 'Your tools' })
    await within(pinned).findByText('Energy Jar')

    fireEvent.click(within(pinned).getByRole('button', { name: 'Move Energy Jar down' }))

    await waitFor(() => {
      const titles = within(pinned)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
      expect(titles).toEqual(['Mood & Symptom Tracker', 'Energy Jar'])
    })
    await waitFor(async () => {
      expect(await fake.getPins()).toEqual(['bloom', 'jar'])
    })
  })

  it('drag reorder', async () => {
    const fake = new FakeRepository()
    fake.pins = ['jar', 'bloom', 'timeline']
    renderHub(fake)

    const pinned = screen.getByRole('region', { name: 'Your tools' })
    await waitFor(() => {
      expect(within(pinned).getAllByRole('article')).toHaveLength(3)
    })

    const cards = within(pinned).getAllByRole('article')
    fireEvent.dragStart(cards[0], {
      dataTransfer: { setData: vi.fn(), effectAllowed: '' },
    })

    await waitFor(() => {
      expect(cards[0].parentElement).toHaveClass('opacity-50')
    })

    const settled = within(pinned).getAllByRole('article')
    fireEvent.dragOver(settled[2])
    fireEvent.drop(settled[2])

    await waitFor(() => {
      const titles = within(pinned)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
      expect(titles).toEqual(['Mood & Symptom Tracker', 'Personal Timeline', 'Energy Jar'])
    })
    await waitFor(async () => {
      expect(await fake.getPins()).toEqual(['bloom', 'timeline', 'jar'])
    })
  })

  it('shows the empty state when nothing is pinned', async () => {
    const fake = new FakeRepository()
    fake.pins = ['jar']
    renderHub(fake)

    const allTools = screen.getByRole('region', { name: 'All tools' })
    await within(allTools).findByText('Mood & Symptom Tracker')

    const pinned = screen.getByRole('region', { name: 'Your tools' })
    fireEvent.click(within(pinned).getByRole('button', { name: 'Unpin Energy Jar from home' }))

    expect(
      await screen.findByText(
        'Nothing pinned yet — tap the star on any tool to keep it at the top.',
      ),
    ).toBeInTheDocument()
  })
})