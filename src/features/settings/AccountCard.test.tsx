import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountCard } from './AccountCard'
import { useAuthMode } from '../../data/RepositoryProvider'
import { createAuthService, lockedMessage, MESSAGES } from '../../auth/authCore'

const mockedUseAuthMode = vi.mocked(useAuthMode)
const mockedCreateAuthService = vi.mocked(createAuthService)

vi.mock('../../data/RepositoryProvider', () => ({ useAuthMode: vi.fn() }))
vi.mock('../../config/supabase', () => ({ supabase: {} }))
vi.mock('../../auth/authCore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../auth/authCore')>()
  return { ...actual, createAuthService: vi.fn() }
})

const fakeService = {
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  lockoutStatus: vi.fn().mockReturnValue({
    locked: false,
    remainingMs: 0,
    remainingSeconds: 0,
  }),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuthMode.mockReturnValue({ mode: 'guest', user: null })
  mockedCreateAuthService.mockReturnValue(fakeService)
  fakeService.lockoutStatus.mockReturnValue({
    locked: false,
    remainingMs: 0,
    remainingSeconds: 0,
  })
})

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return screen.getByRole('form', { name: 'Account form' })
}

describe('AccountCard', () => {
  it('renders a Sign in button and reveals the form when clicked', async () => {
    const user = userEvent.setup()
    render(<AccountCard />)

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()

    await openForm(user)

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('signs in with the entered username and password on success', async () => {
    const user = userEvent.setup()
    fakeService.signIn.mockResolvedValue({
      ok: true,
      data: { id: 'u1', username: 'ada' },
    })
    render(<AccountCard />)

    const form = await openForm(user)
    await user.type(within(form).getByLabelText('Username'), 'ada')
    await user.type(within(form).getByLabelText('Password'), 'secret1')
    await user.click(within(form).getByRole('button', { name: 'Sign in' }))

    expect(fakeService.signIn).toHaveBeenCalledWith('ada', 'secret1')
    expect(
      screen.queryByText('Incorrect username or password.'),
    ).not.toBeInTheDocument()
  })

  it('shows the error from a failed signIn', async () => {
    const user = userEvent.setup()
    fakeService.signIn.mockResolvedValue({
      ok: false,
      error: 'Incorrect username or password.',
    })
    render(<AccountCard />)

    const form = await openForm(user)
    await user.type(within(form).getByLabelText('Username'), 'ada')
    await user.type(within(form).getByLabelText('Password'), 'secret1')
    await user.click(within(form).getByRole('button', { name: 'Sign in' }))

    expect(
      await screen.findByText('Incorrect username or password.'),
    ).toBeInTheDocument()
  })

  it('validates the username client-side and does not call signIn', async () => {
    const user = userEvent.setup()
    render(<AccountCard />)

    const form = await openForm(user)
    await user.type(within(form).getByLabelText('Username'), 'bad name!')
    await user.type(within(form).getByLabelText('Password'), 'secret1')
    await user.click(within(form).getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText(MESSAGES.USERNAME_INVALID)).toBeInTheDocument()
    expect(fakeService.signIn).not.toHaveBeenCalled()
  })

  it('shows the signed-in state and signs out on demand', async () => {
    const user = userEvent.setup()
    mockedUseAuthMode.mockReturnValue({
      mode: 'signed-in',
      user: { id: 'u1', username: 'ada' },
    })
    render(<AccountCard />)

    expect(screen.getByText('Signed in as ada')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(fakeService.signOut).toHaveBeenCalled()
  })

  it('disables submit and shows the countdown when locked out', async () => {
    const user = userEvent.setup()
    fakeService.signIn.mockResolvedValue({
      ok: false,
      error: 'Incorrect username or password.',
    })
    fakeService.lockoutStatus.mockReturnValue({
      locked: true,
      remainingMs: 42_000,
      remainingSeconds: 42,
    })
    render(<AccountCard />)

    const form = await openForm(user)
    await user.type(within(form).getByLabelText('Username'), 'ada')
    await user.type(within(form).getByLabelText('Password'), 'secret1')
    await user.click(within(form).getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText(lockedMessage(42))).toBeInTheDocument()
    expect(within(form).getByRole('button', { name: 'Sign in' })).toBeDisabled()
  })
})