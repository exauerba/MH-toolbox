import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthService } from '../../auth/authCore'
import { RepositoryProvider, useAuthMode } from '../../data/RepositoryProvider'
import { FakeRepository } from '../../data/testing/fakeRepository'
import { DeleteDataCard } from './DeleteDataCard'

const mockedUseAuthMode = vi.mocked(useAuthMode)
const mockedCreateAuthService = vi.mocked(createAuthService)

vi.mock('../../data/RepositoryProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/RepositoryProvider')>()
  return { ...actual, useAuthMode: vi.fn() }
})

vi.mock('../../auth/authCore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/authCore')>()
  return { ...actual, createAuthService: vi.fn() }
})

const signOut = vi.fn().mockResolvedValue({ ok: true, data: null })

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuthMode.mockReturnValue({ mode: 'guest', user: null })
  mockedCreateAuthService.mockReturnValue({
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut,
    getSession: vi.fn(),
    lockoutStatus: vi.fn(),
  })
})

function renderCard(repo: FakeRepository) {
  return render(
    <RepositoryProvider initialRepo={repo}>
      <DeleteDataCard />
    </RepositoryProvider>,
  )
}

async function confirmDelete(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Delete data' }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Delete everything' }))
}

describe('DeleteDataCard', () => {
  it('wipes the data and does not sign out in guest mode', async () => {
    const repo = new FakeRepository()
    await repo.setPins(['home', 'jar'])
    renderCard(repo)
    const user = userEvent.setup()

    await confirmDelete(user)

    expect(await repo.getPins()).toHaveLength(0)
    expect(signOut).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('wipes the data and signs out when signed in', async () => {
    mockedUseAuthMode.mockReturnValue({
      mode: 'signed-in',
      user: { id: 'u1', username: 'ada' },
    })
    const repo = new FakeRepository()
    await repo.setPins(['home', 'jar'])
    renderCard(repo)
    const user = userEvent.setup()

    await confirmDelete(user)

    expect(await repo.getPins()).toHaveLength(0)
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an error inside the modal when the wipe throws', async () => {
    const repo = new FakeRepository()
    await repo.setPins(['home'])
    vi.spyOn(repo, 'deleteAllData').mockRejectedValue(new Error('wipe failed'))
    renderCard(repo)
    const user = userEvent.setup()

    await confirmDelete(user)

    expect(await screen.findByText('wipe failed')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(signOut).not.toHaveBeenCalled()
  })
})