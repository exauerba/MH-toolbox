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

  it('shows the medication loading state on the default Log Dose section', async () => {
    const fake = new FakeRepository()
    renderBreatheScreen(fake)

    // The medication picker starts in its loading skeleton on the log tab.
    expect(screen.getByTestId('loading-medications')).toBeInTheDocument()

    // Let the pending medication load settle so the test exits cleanly.
    await screen.findByText(/No medications available/i)
  })

  it('renders the Log Dose section selected by default with the dose form', async () => {
    const fake = new FakeRepository()
    renderBreatheScreen(fake)

    // The tab bar is a radiogroup (SegmentedControl), not a tablist.
    expect(screen.getByRole('radiogroup', { name: /Sections/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Log Dose/ })).toBeChecked()

    // With no medications yet, the picker shows a friendly placeholder.
    expect(await screen.findByText(/No medications available/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Time/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log Dose' })).toBeInTheDocument()
  })

  it('allows switching between sections', async () => {
    const fake = new FakeRepository()
    renderBreatheScreen(fake)

    await userEvent.click(screen.getByRole('radio', { name: /Check-in/ }))
    expect(screen.getByRole('radio', { name: /Check-in/ })).toBeChecked()
    expect(await screen.findByText(/No check-ins yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Check-in' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: /Medications/ }))
    expect(screen.getByRole('radio', { name: /Medications/ })).toBeChecked()
    expect(await screen.findByText(/No medications yet/i)).toBeInTheDocument()
  })

  it('seeds a sample fortnight from the empty state', async () => {
    const fake = new FakeRepository()
    renderBreatheScreen(fake)

    await userEvent.click(screen.getByRole('radio', { name: /Check-in/ }))
    await userEvent.click(await screen.findByRole('button', { name: /Try a sample fortnight/i }))

    await waitFor(async () => {
      expect((await fake.listBreatheMeds()).length).toBe(2)
    })
    expect((await fake.listBreatheCheckins()).length).toBe(14)
    expect((await fake.listBreatheDoseLogs()).length).toBeGreaterThan(0)
  })

  it('allows logging a dose', async () => {
    const fake = new FakeRepository()
    await fake.saveBreatheMed({
      name: 'Ventolin',
      medType: 'reliever',
    })

    renderBreatheScreen(fake)

    const medicationSelect = await screen.findByRole('combobox')
    const meds = await fake.listBreatheMeds()
    await userEvent.selectOptions(medicationSelect, meds[0].id)

    const timeInput = screen.getByLabelText(/Time/i)
    await userEvent.clear(timeInput)
    await userEvent.type(timeInput, '14:30')

    await userEvent.click(screen.getByRole('button', { name: 'Log Dose' }))

    await waitFor(() => {
      expect(timeInput).toHaveValue('')
    })
  })
})