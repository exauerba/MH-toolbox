import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepositoryProvider, useAuthMode } from '../../data/RepositoryProvider'
import { FakeRepository } from '../../data/testing/fakeRepository'
import type { LanternScale } from '../../data/types'
import { ShareTab } from './ShareTab'

const mockedUseAuthMode = vi.mocked(useAuthMode)

vi.mock('../../data/RepositoryProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/RepositoryProvider')>()
  return { ...actual, useAuthMode: vi.fn() }
})

const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuthMode.mockReturnValue({ mode: 'guest', user: null })
  // userEvent.setup() installs its own clipboard stub, so define ours here and
  // avoid userEvent in tests that exercise the clipboard.
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
})

function scale(): LanternScale {
  return {
    id: 'scale-1',
    name: 'My Lantern',
    levelCount: 2,
    levels: [
      { id: 'l1', position: 1, label: 'Grounded', description: 'Steady.', actions: ['Breathe with me'] },
      { id: 'l2', position: 2, label: 'Not safe alone', description: 'Afraid.', actions: ['Stay with me'] },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function renderShareTab(repo: FakeRepository, onError = vi.fn()) {
  return render(
    <RepositoryProvider initialRepo={repo}>
      <ShareTab scale={scale()} onError={onError} />
    </RepositoryProvider>,
  )
}

describe('ShareTab', () => {
  it('copies the scale as plain text', async () => {
    renderShareTab(new FakeRepository())

    fireEvent.click(screen.getByRole('button', { name: /Copy as text/ }))

    await waitFor(() => expect(writeText).toHaveBeenCalled())
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('My Lantern — where I am, and what helps'),
    )
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('1. Grounded'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('What helps: Stay with me'))
  })

  it('tells guests that partner links need an account', () => {
    renderShareTab(new FakeRepository())
    expect(screen.getByText(/Partner links need an account/)).toBeInTheDocument()
  })

  it('creates, lists and revokes partner links when signed in', async () => {
    mockedUseAuthMode.mockReturnValue({ mode: 'signed-in', user: { id: 'u1', username: 'ada' } })
    const repo = new FakeRepository()
    await repo.saveLanternScale({ name: 'My Lantern', levelCount: 2, levels: scale().levels })
    const user = userEvent.setup()
    renderShareTab(repo)

    await user.type(screen.getByLabelText(/Who is this for/), 'Sam')
    await user.click(screen.getByRole('button', { name: /Create link/ }))

    expect(await screen.findByText('Sam')).toBeInTheDocument()
    expect(screen.getByText(/share\//)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Revoke link for Sam/ }))
    await waitFor(() => expect(screen.queryByText('Sam')).not.toBeInTheDocument())
    const remaining = await repo.listLanternShares()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].revokedAt).toBeTruthy()
  })
})