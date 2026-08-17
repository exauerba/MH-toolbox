import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExportBundle } from '../../data/types'
import type { ToolboxRepository } from '../../data/repository'
import { MigrationPrompt } from './MigrationPrompt'

// vi.mock factories are hoisted above top-level consts, so the mocked deps
// are built with vi.hoisted to be reachable from both the factories and tests.
const { useAuthMode, useRepository, migrateLocalToSupabase, LocalRepository } = vi.hoisted(() => ({
  useAuthMode: vi.fn(),
  useRepository: vi.fn(),
  migrateLocalToSupabase: vi.fn(),
  LocalRepository: vi.fn(),
}))

vi.mock('../../data/RepositoryProvider', () => ({ useAuthMode, useRepository }))
vi.mock('../../data/migrateLocal', () => ({ migrateLocalToSupabase }))
vi.mock('../../data/local/LocalRepository', () => ({ LocalRepository }))

const emptyBundle: ExportBundle = {
  exportedAt: '2026-01-01T00:00:00.000Z',
  profile: null,
  pins: [],
  jarDays: [],
  jarLogs: [],
  timelineEntries: [],
  timelineZones: [],
  timelineImages: [],
}

const dataBundle: ExportBundle = {
  ...emptyBundle,
  pins: ['jar'],
}

const remoteRepo = { getProfile: vi.fn() }

function installLocal(bundle: ExportBundle) {
  const instance = { exportAll: vi.fn().mockResolvedValue(bundle) }
  LocalRepository.mockImplementation(() => instance)
  return instance
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthMode.mockReturnValue({ mode: 'signed-in', user: { id: 'u1', username: 'ada' } })
  useRepository.mockReturnValue(remoteRepo as unknown as ToolboxRepository)
  remoteRepo.getProfile.mockResolvedValue(null)
})

describe('MigrationPrompt', () => {
  it('is hidden in guest mode', () => {
    useAuthMode.mockReturnValue({ mode: 'guest', user: null })
    const { container } = render(<MigrationPrompt />)
    expect(container).toBeEmptyDOMElement()
  })

  it('is hidden when signed in but there is no local data', async () => {
    installLocal(emptyBundle)
    const { container } = render(<MigrationPrompt />)
    await waitFor(() => expect(remoteRepo.getProfile).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('is hidden when the local data was already imported', async () => {
    installLocal(dataBundle)
    remoteRepo.getProfile.mockResolvedValue({
      theme: 'light',
      jarDefaultSpoons: 5,
      jarResetHour: 0,
      onboardingDone: true,
      localDataImportedAt: '2026-01-01T00:00:00.000Z',
    })
    const { container } = render(<MigrationPrompt />)
    await waitFor(() => expect(remoteRepo.getProfile).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the modal when local data exists and is not imported', async () => {
    installLocal(dataBundle)
    render(<MigrationPrompt />)
    expect(
      await screen.findByRole('heading', { name: 'Bring your local data with you?' }),
    ).toBeInTheDocument()
  })

  it('imports the data on confirm and closes the modal', async () => {
    const local = installLocal(dataBundle)
    migrateLocalToSupabase.mockResolvedValue({ migrated: true, counts: {} })
    render(<MigrationPrompt />)

    fireEvent.click(await screen.findByRole('button', { name: 'Import my data' }))

    expect(migrateLocalToSupabase).toHaveBeenCalledWith(local, remoteRepo)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows an error and keeps the modal open when the import fails', async () => {
    installLocal(dataBundle)
    migrateLocalToSupabase.mockRejectedValue(new Error('migration failed'))
    render(<MigrationPrompt />)

    fireEvent.click(await screen.findByRole('button', { name: 'Import my data' }))

    expect(await screen.findByText('migration failed')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})