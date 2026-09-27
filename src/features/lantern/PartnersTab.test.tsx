import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepositoryProvider, useAuthMode } from '../../data/RepositoryProvider'
import { FakeRepository } from '../../data/testing/fakeRepository'
import type {
  LanternLevel,
  LanternPartnership,
  LanternScale,
  PartnerStatus,
} from '../../data/types'
import { currentLevelExpiresAt } from '../../data/lanternTtl'
import { PartnersTab } from './PartnersTab'

const mockedUseAuthMode = vi.mocked(useAuthMode)

vi.mock('../../data/RepositoryProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/RepositoryProvider')>()
  return { ...actual, useAuthMode: vi.fn() }
})

// Three levels, never two: `isCrisisLevel` flags the top TWO levels, so on a
// 2-level scale both are crisis and single-match queries collide.
function scale(): LanternScale {
  const levels: LanternLevel[] = [
    {
      id: 'l1',
      position: 1,
      label: 'Steady',
      description: 'Grounded enough.',
      actions: ['Breathe with me'],
    },
    {
      id: 'l2',
      position: 2,
      label: 'Stretched',
      description: 'Hard to hold.',
      actions: ['Stay close'],
    },
    {
      id: 'l3',
      position: 3,
      label: 'At the edge',
      description: 'Not safe alone.',
      actions: ['Stay with me'],
    },
  ]
  return {
    id: 'scale-1',
    name: 'My Lantern',
    levelCount: levels.length,
    levels,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function partnership(over: Partial<LanternPartnership> = {}): LanternPartnership {
  const now = new Date().toISOString()
  return {
    id: 'p-1',
    sharerId: 'u-sam',
    partnerId: 'u1',
    side: 'incoming',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    sharerUsername: 'Sam',
    ...over,
  }
}

function partnerStatus(): PartnerStatus {
  return {
    sharerId: 'u-sam',
    sharerUsername: 'Sam',
    scaleName: "Sam's Lantern",
    levelCount: 3,
    levels: scale().levels,
    currentLevel: {
      id: 'cur-1',
      levelId: 'l1',
      setAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      expiresAt: currentLevelExpiresAt(new Date()),
      position: 1,
      label: 'Steady',
      description: 'Grounded enough.',
      actions: ['Breathe with me'],
    },
  }
}

function renderTab(repo: FakeRepository, onError = vi.fn()) {
  return render(
    <RepositoryProvider initialRepo={repo}>
      <PartnersTab scale={scale()} onError={onError} />
    </RepositoryProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuthMode.mockReturnValue({ mode: 'guest', user: null })
})

describe('PartnersTab (guest)', () => {
  it('keeps the current-level section usable without an account', async () => {
    // The tab loads on mount; flush that inside act so no state update escapes.
    await act(async () => {
      renderTab(new FakeRepository())
    })

    expect(screen.getByRole('heading', { name: 'Your current level' })).toBeInTheDocument()
    expect(screen.getByText(/Nobody sees this unless you add them/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Set my level' })).toBeInTheDocument()
  })

  it('lets a guest set a level and shows it on the card', async () => {
    const repo = new FakeRepository()
    renderTab(repo)

    fireEvent.click(screen.getByRole('button', { name: 'Set my level' }))
    fireEvent.click(screen.getByRole('button', { name: /Stretched/ }))
    fireEvent.click(screen.getByRole('button', { name: /Set this level/ }))

    expect(await screen.findByText(/Stretched/)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Still true?' })).toBeInTheDocument()
    expect((await repo.getCurrentLevel())?.levelId).toBe('l2')
  })

  it('asks for an account instead of the partner lists', async () => {
    await act(async () => {
      renderTab(new FakeRepository())
    })

    expect(screen.getByRole('heading', { name: 'People who share with you' })).toBeInTheDocument()
    expect(screen.getByText(/Seeing someone else's lantern needs an account/)).toBeInTheDocument()
    // The outgoing half is signed-in only, so no add form leaks into guest mode.
    expect(
      screen.queryByRole('heading', { name: 'People who can see your level' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Their username')).not.toBeInTheDocument()
  })
})

describe('PartnersTab (signed-in)', () => {
  beforeEach(() => {
    mockedUseAuthMode.mockReturnValue({ mode: 'signed-in', user: { id: 'u1', username: 'ada' } })
  })

  it('adds a partner by trimmed username', async () => {
    const repo = new FakeRepository()
    const addPartner = vi.spyOn(repo, 'addPartner')
    renderTab(repo)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Their username'), '  sam  ')
    await user.click(screen.getByRole('button', { name: 'Add person' }))

    await waitFor(() => expect(addPartner).toHaveBeenCalledWith('sam'))
    expect(await screen.findByText('sam')).toBeInTheDocument()
    expect(screen.getByText('Waiting for them to accept')).toBeInTheDocument()
  })

  it('accepts an incoming request', async () => {
    const repo = new FakeRepository()
    // The fake only ever models the signed-in user as the sharer, so the
    // incoming side has to be injected.
    vi.spyOn(repo, 'listPartnerships').mockResolvedValue([partnership()])
    const acceptPartnership = vi.spyOn(repo, 'acceptPartnership')
    renderTab(repo)

    expect(await screen.findByText(/would like to share their scale with you/)).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

    await waitFor(() => expect(acceptPartnership).toHaveBeenCalledWith('p-1'))
  })

  it('declines an incoming request', async () => {
    const repo = new FakeRepository()
    vi.spyOn(repo, 'listPartnerships').mockResolvedValue([partnership()])
    const declinePartnership = vi.spyOn(repo, 'declinePartnership')
    renderTab(repo)

    expect(await screen.findByText(/would like to share their scale with you/)).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    await waitFor(() => expect(declinePartnership).toHaveBeenCalledWith('p-1'))
  })

  it('revokes someone who can see the level', async () => {
    const repo = new FakeRepository()
    vi.spyOn(repo, 'listPartnerships').mockResolvedValue([
      partnership({ side: 'outgoing', status: 'active', partnerUsername: 'Sam' }),
    ])
    const revokePartnership = vi.spyOn(repo, 'revokePartnership')
    renderTab(repo)

    expect(await screen.findByText('Can see your level')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Sam' }))

    await waitFor(() => expect(revokePartnership).toHaveBeenCalledWith('p-1'))
  })

  it('re-sets the same level from "Still true?"', async () => {
    const repo = new FakeRepository()
    const setCurrentLevel = vi.spyOn(repo, 'setCurrentLevel')
    // Seeded through the instance so the spy keeps its `this` binding.
    await repo.setCurrentLevel('l1')
    renderTab(repo)

    fireEvent.click(await screen.findByRole('button', { name: 'Still true?' }))

    await waitFor(() => expect(setCurrentLevel).toHaveBeenCalledTimes(2))
    expect(setCurrentLevel).toHaveBeenNthCalledWith(1, 'l1')
    expect(setCurrentLevel).toHaveBeenNthCalledWith(2, 'l1')
  })

  it('renders a read-only pane for an active incoming partnership', async () => {
    const repo = new FakeRepository()
    vi.spyOn(repo, 'getPartnerStatus').mockResolvedValue([partnerStatus()])
    renderTab(repo)

    expect(await screen.findByRole('region', { name: "Sam's lantern" })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sam is at level 1.' })).toBeInTheDocument()
    // The signed-in branch, not the account-required copy.
    expect(screen.getByText(/their scale and current level appear here/)).toBeInTheDocument()
    expect(screen.queryByText(/needs an account/)).not.toBeInTheDocument()
  })
})
