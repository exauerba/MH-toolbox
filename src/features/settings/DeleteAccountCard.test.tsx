import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeleteAccountCard } from './DeleteAccountCard'
import { useAuthMode } from '../../data/RepositoryProvider'

const { invoke, getSession } = vi.hoisted(() => ({
  invoke: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('../../config/supabase', () => ({
  supabase: {
    auth: { getSession },
    functions: { invoke },
  },
}))

vi.mock('../../data/RepositoryProvider', () => ({
  useAuthMode: vi.fn(),
  useRepository: vi.fn(),
}))

const mockedUseAuthMode = vi.mocked(useAuthMode)

describe('DeleteAccountCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseAuthMode.mockReturnValue({ mode: 'signed-in', user: { id: 'u1', username: 'ada' } })
    getSession.mockResolvedValue({ data: { session: { access_token: 'tok-123' } } })
    invoke.mockResolvedValue({ data: { ok: true }, error: null })
  })

  it('renders nothing in guest mode', () => {
    mockedUseAuthMode.mockReturnValue({ mode: 'guest', user: null })
    const { container } = render(<DeleteAccountCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('deletes the account with the session token', async () => {
    const user = userEvent.setup()
    render(<DeleteAccountCard />)
    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    await user.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(invoke).toHaveBeenCalledWith('steady-delete-account', {
      headers: { Authorization: 'Bearer tok-123' },
    })
  })

  it('shows an error when the function fails', async () => {
    invoke.mockRejectedValue(new Error('Could not delete account'))
    const user = userEvent.setup()
    render(<DeleteAccountCard />)
    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    await user.click(screen.getByRole('button', { name: 'Delete forever' }))
    expect(await screen.findByText('Could not delete account')).toBeInTheDocument()
  })
})