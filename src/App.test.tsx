vi.mock('../src/config/supabase', () => ({ supabase: null }))

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the steady hub home', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', {
        name: 'A toolbox you can hold onto.',
      }),
    ).toBeInTheDocument()
    // The hub directory lists the tools.
    expect(screen.getByText('Energy Jar')).toBeInTheDocument()
    expect(screen.getByText('Mood & Symptom Tracker')).toBeInTheDocument()
    // Global chrome is present.
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })
})
