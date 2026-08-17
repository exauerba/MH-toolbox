import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepositoryProvider, useAuthMode, useRepository } from './RepositoryProvider'
import { FakeRepository } from './testing/fakeRepository'

// vi.mock factories are hoisted above top-level consts, so the fake auth must
// be built with vi.hoisted to be reachable from both the factory and the tests.
const { authListeners, fakeSupabase } = vi.hoisted(() => {
  const authListeners: Array<(event: string, session: unknown) => void> = []
  const fakeSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        authListeners.push(cb)
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
    },
  }
  return { authListeners, fakeSupabase }
})

vi.mock('../config/supabase', () => ({ supabase: fakeSupabase }))

const Probe = () => {
  const repo = useRepository()
  const { mode, user } = useAuthMode()
  return <div data-testid="probe">{mode}:{user?.username ?? 'none'}:{repo.constructor.name}</div>
}

describe('RepositoryProvider', () => {
  beforeEach(() => {
    authListeners.length = 0
    fakeSupabase.auth.onAuthStateChange.mockClear()
  })

  it('starts in guest mode with the local repository', () => {
    render(
      <RepositoryProvider>
        <Probe />
      </RepositoryProvider>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('guest:none:LocalRepository')
    expect(fakeSupabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('swaps to the Supabase repository when a session arrives', async () => {
    render(
      <RepositoryProvider>
        <Probe />
      </RepositoryProvider>,
    )
    await waitFor(() => {
      authListeners[0]('SIGNED_IN', { user: { id: 'u1', email: 'ada@bloom.app' } })
      expect(screen.getByTestId('probe')).toHaveTextContent('signed-in:ada:SupabaseRepository')
    })
  })

  it('returns to guest mode when the session clears', async () => {
    render(
      <RepositoryProvider>
        <Probe />
      </RepositoryProvider>,
    )
    await waitFor(() => {
      authListeners[0]('SIGNED_IN', { user: { id: 'u1', email: 'ada@bloom.app' } })
      expect(screen.getByTestId('probe')).toHaveTextContent('signed-in:ada:SupabaseRepository')
    })
    await waitFor(() => {
      authListeners[0]('SIGNED_OUT', null)
      expect(screen.getByTestId('probe')).toHaveTextContent('guest:none:LocalRepository')
    })
  })

  it('uses an injected repo and skips auth entirely', () => {
    const fake = new FakeRepository()
    render(
      <RepositoryProvider initialRepo={fake}>
        <Probe />
      </RepositoryProvider>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('guest:none:FakeRepository')
    expect(fakeSupabase.auth.onAuthStateChange).not.toHaveBeenCalled()
  })
})