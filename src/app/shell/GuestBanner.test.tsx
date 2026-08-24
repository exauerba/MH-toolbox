import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthMode } from '../../data/RepositoryProvider'
import { GuestBanner } from './GuestBanner'

const mockedUseAuthMode = vi.mocked(useAuthMode)

vi.mock('../../data/RepositoryProvider', () => ({ useAuthMode: vi.fn() }))

const DISMISS_KEY = 'steady:guest-banner-dismissed'

function StateProbe() {
  const location = useLocation()
  return <div data-testid="state-probe">{JSON.stringify(location.state)}</div>
}

function renderGuestBanner() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<GuestBanner />} />
        <Route
          path="/settings"
          element={
            <div>
              <div>settings-marker</div>
              <StateProbe />
            </div>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  mockedUseAuthMode.mockReturnValue({ mode: 'guest', user: null })
})

describe('GuestBanner', () => {
  it('renders the guest-mode banner copy', () => {
    renderGuestBanner()

    expect(screen.getByText('Guest mode')).toBeInTheDocument()
    expect(
      screen.getByText('Using locally on this device — sign in to back this up.'),
    ).toBeInTheDocument()
  })

  it('navigates to /settings with state { openSignIn: true } when clicked', () => {
    renderGuestBanner()

    fireEvent.click(screen.getByRole('button', { name: /sign in to back this up/i }))

    expect(screen.getByText('settings-marker')).toBeInTheDocument()
    expect(screen.getByTestId('state-probe').textContent).toContain('"openSignIn":true')
  })

  it('returns null when signed in', () => {
    mockedUseAuthMode.mockReturnValue({
      mode: 'signed-in',
      user: { id: 'u1', username: 'ada' },
    })

    const { container } = renderGuestBanner()
    expect(container).toBeEmptyDOMElement()
  })

  it('does not render on the settings route', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<GuestBanner />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Guest mode')).not.toBeInTheDocument()
  })

  it('dismisses the banner and keeps it hidden on re-render', () => {
    const { unmount } = renderGuestBanner()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss this message' }))

    expect(screen.queryByText('Guest mode')).not.toBeInTheDocument()
    expect(sessionStorage.getItem(DISMISS_KEY)).toBe('1')

    unmount()
    renderGuestBanner()
    expect(screen.queryByText('Guest mode')).not.toBeInTheDocument()
  })
})