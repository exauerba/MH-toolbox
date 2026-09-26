import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SharedLantern } from './SharedLantern'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../../config/supabase', () => ({ supabase: { rpc } }))

beforeEach(() => {
  vi.clearAllMocks()
})

function renderShared(token: string) {
  return render(
    <MemoryRouter initialEntries={[`/share/${token}`]}>
      <Routes>
        <Route path="/share/:token" element={<SharedLantern />} />
      </Routes>
    </MemoryRouter>,
  )
}

const sharedScale = {
  name: 'My Lantern',
  levelCount: 3,
  levels: [
    { position: 1, label: 'Grounded', description: 'Steady.', actions: ['Breathe with me'] },
    { position: 2, label: 'Struggling', description: 'Hard.', actions: ['Stay close'] },
    { position: 3, label: 'Not safe alone', description: 'Afraid.', actions: ['Stay with me'] },
  ],
}

describe('SharedLantern', () => {
  it('renders a shared scale read-only', async () => {
    rpc.mockResolvedValue({ data: sharedScale, error: null })
    renderShared('abc')

    expect(await screen.findByRole('heading', { name: 'My Lantern' })).toBeInTheDocument()
    expect(screen.getByText('Grounded')).toBeInTheDocument()
    expect(screen.getByText('Stay with me')).toBeInTheDocument()
    expect(screen.getByText(/private, read-only lantern/)).toBeInTheDocument()
  })

  it('shows crisis resources on the top level', async () => {
    rpc.mockResolvedValue({ data: sharedScale, error: null })
    renderShared('abc')

    expect(await screen.findAllByText('This is a crisis level — stay close.')).toHaveLength(2)
    expect(screen.getAllByText(/988 Suicide & Crisis Lifeline/).length).toBeGreaterThan(0)
  })

  it('shows a friendly message for a revoked or unknown link', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    renderShared('dead-token')

    expect(await screen.findByText("This lantern isn't lit")).toBeInTheDocument()
  })

  it('shows an error when the RPC fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    renderShared('abc')

    expect(await screen.findByText('This link could not be opened.')).toBeInTheDocument()
  })
})