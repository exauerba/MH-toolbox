import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RepositoryProvider } from '../../data/RepositoryProvider'
import { FakeRepository } from '../../data/testing/fakeRepository'
import { BreatheScreen } from './BreatheScreen'

function renderBreatheScreen(fake: FakeRepository) {
  return render(
    <MemoryRouter>
      <RepositoryProvider initialRepo={fake}>
        <BreatheScreen />
      </RepositoryProvider>
    </MemoryRouter>,
  )
}

describe('BreatheScreen', () => {
  it('renders the header with back button and title', async () => {
    const fake = new FakeRepository()
    renderBreatheScreen(fake)
    
    expect(await screen.findByRole('button', { name: /Back to home/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Breathe')
  })
  
  it('shows loading states initially', async () => {
    const fake = new FakeRepository()
    renderBreatheScreen(fake)
    
    // Should show loading indicators for medications and check-ins
    expect(screen.getByTestId('loading-medications')).toBeInTheDocument()
    expect(screen.getByTestId('loading-checkins')).toBeInTheDocument()
  })
  
  it('renders the Log Dose tab by default', async () => {
    const fake = new FakeRepository()
    // Add some medications to avoid empty state
    await fake.saveBreatheMed({
      name: 'Ventolin',
      medType: 'reliever',
    })
    
    renderBreatheScreen(fake)
    
    // Should show Log Dose tab selected
    expect(screen.getByRole('tab', { name: /Log Dose/i })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText(/Log Dose/i)).toBeInTheDocument()
  })
  
  it('allows switching between tabs', async () => {
    const fake = new FakeRepository()
    renderBreatheScreen(fake)
    
    // Click on Check-in tab
    await userEvent.click(screen.getByRole('tab', { name: /Check-in/i }))
    expect(screen.getByRole('tab', { name: /Check-in/i })).toHaveAttribute('aria-selected', 'true')
    
    // Click on Medications tab
    await userEvent.click(screen.getByRole('tab', { name: /Medications/i }))
    expect(screen.getByRole('tab', { name: /Medications/i })).toHaveAttribute('aria-selected', 'true')
  })
  
  it('shows empty state for medications when none exist', async () => {
    const fake = new FakeRepository()
    renderBreatheScreen(fake)
    
    // Switch to medications tab
    await userEvent.click(screen.getByRole('tab', { name: /Medications/i }))
    
    expect(await screen.findByText(/No medications yet/i)).toBeInTheDocument()
  })
  
  it('allows logging a dose', async () => {
    const fake = new FakeRepository()
    // Add a medication
    await fake.saveBreatheMed({
      name: 'Ventolin',
      medType: 'reliever',
    })
    
    renderBreatheScreen(fake)
    
    // Select the medication
    const medicationSelect = screen.getByRole('combobox')
    const meds = await fake.listBreatheMeds()
    await userEvent.selectOptions(medicationSelect, meds[0].id)
    
    // Set time
    const timeInput = screen.getByLabelText(/Time/i)
    await userEvent.clear(timeInput)
    await userEvent.type(timeInput, '14:30')
    
    // Click log dose button
    await userEvent.click(screen.getByRole('button', { name: /Log Dose/i }))
    
    // Wait for the repository to be called
    await waitFor(() => {
      // We can't easily spy on the fake repository's method, but we can check that the form resets
      expect(timeInput).toHaveValue('')
    })
  })
})