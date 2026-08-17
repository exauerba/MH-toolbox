import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RepositoryProvider } from '../../data/RepositoryProvider'
import { FakeRepository } from '../../data/testing/fakeRepository'
import { fromISODate, todayForResetHour, toISODate } from '../../shared/day'
import { JarScreen } from './JarScreen'

function renderJar(fake: FakeRepository) {
  return render(
    <MemoryRouter>
      <RepositoryProvider initialRepo={fake}>
        <JarScreen />
      </RepositoryProvider>
    </MemoryRouter>,
  )
}

describe('JarScreen', () => {
  it('renders an empty jar with plenty left', async () => {
    const fake = new FakeRepository()
    renderJar(fake)

    expect(
      await screen.findByText('Nothing logged yet today. The jar stays full until you spend.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Plenty left')).toBeInTheDocument()
  })

  it('persists a quick-add into the log and the repository', async () => {
    const fake = new FakeRepository()
    renderJar(fake)
    await screen.findByText('Nothing logged yet today. The jar stays full until you spend.')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Increase by 0.5/ }))
    await user.click(screen.getByRole('button', { name: /^Log / }))

    const todaySection = screen.getByText("Today's log").parentElement as HTMLElement
    expect(await within(todaySection).findByText('1 spoons')).toBeInTheDocument()

    const logs = await fake.listJarLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0].spent).toBe(1)
  })

  it('shows the borrowed banner when spent exceeds the jar', async () => {
    const fake = new FakeRepository()
    const today = todayForResetHour(0)
    await fake.addJarLog({ date: today, spent: 8 })
    await fake.addJarLog({ date: today, spent: 5 })
    renderJar(fake)

    expect(await screen.findByText('Borrowed from tomorrow')).toBeInTheDocument()
  })

  it('shows the running-low banner when few spoons remain', async () => {
    const fake = new FakeRepository()
    const today = todayForResetHour(0)
    await fake.addJarLog({ date: today, spent: 10 })
    renderJar(fake)

    expect(await screen.findByText('Running low')).toBeInTheDocument()
  })

  it('deletes a log from the UI and the repository', async () => {
    const fake = new FakeRepository()
    const today = todayForResetHour(0)
    await fake.addJarLog({ date: today, spent: 2, label: 'Shower' })
    renderJar(fake)
    await screen.findByText('2 spoons')

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Delete "Shower"' }))

    await waitFor(() => expect(screen.queryByText('2 spoons')).not.toBeInTheDocument())
    expect(await fake.listJarLogs()).toHaveLength(0)
  })

  it('renders the last 7 days chart with the right day labels', async () => {
    const fake = new FakeRepository()
    const today = todayForResetHour(0)
    const threeDaysAgo = fromISODate(today)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    await fake.addJarLog({ date: today, spent: 4 })
    await fake.addJarLog({ date: toISODate(threeDaysAgo), spent: 2 })
    renderJar(fake)
    await screen.findByText("Today's log")

    const chart = screen.getByText('Last 7 days').parentElement as HTMLElement
    const todayLabel = fromISODate(today).toLocaleDateString(undefined, { weekday: 'short' })
    const threeDaysLabel = threeDaysAgo.toLocaleDateString(undefined, { weekday: 'short' })

    expect(within(chart).getByText(todayLabel)).toBeInTheDocument()
    expect(within(chart).getByText(threeDaysLabel)).toBeInTheDocument()
  })

  it('sums pattern values by label', async () => {
    const fake = new FakeRepository()
    const today = todayForResetHour(0)
    await fake.addJarLog({ date: today, spent: 2, label: 'Shower' })
    await fake.addJarLog({ date: today, spent: 1, label: 'Shower' })
    await fake.addJarLog({ date: today, spent: 1.5, label: 'Work' })
    await fake.addJarLog({ date: today, spent: 0.5 })
    renderJar(fake)
    await screen.findByText("Today's log")

    const section = screen.getByText('Where your spoons went').parentElement as HTMLElement

    expect(await within(section).findByText('Shower')).toBeInTheDocument()
    expect(within(section).getByText('3')).toBeInTheDocument()
    expect(within(section).getByText('Work')).toBeInTheDocument()
    expect(within(section).getByText('1.5')).toBeInTheDocument()
    expect(within(section).getByText('No label')).toBeInTheDocument()
    expect(within(section).getByText('0.5')).toBeInTheDocument()
  })

  it('groups logs by the profile reset hour', async () => {
    const fake = new FakeRepository()
    await fake.setProfile({
      theme: 'light',
      jarDefaultSpoons: 10,
      jarResetHour: 4,
      onboardingDone: true,
      localDataImportedAt: null,
    })
    const today = todayForResetHour(4)
    await fake.addJarLog({ date: today, spent: 3, label: 'Early' })
    renderJar(fake)
    await screen.findByText("Today's log")

    const todaySection = screen.getByText("Today's log").parentElement as HTMLElement
    expect(await within(todaySection).findByText('Early')).toBeInTheDocument()
    expect(within(todaySection).getByText('3 spoons')).toBeInTheDocument()
    expect(screen.getByText(/Resets at 4:00/)).toBeInTheDocument()
  })
})