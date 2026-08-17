import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RepositoryProvider } from '../../data/RepositoryProvider'
import { FakeRepository } from '../../data/testing/fakeRepository'
import { ExportCard } from './ExportCard'

const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:mock')
const revokeObjectURL = vi.fn()
const anchorClick = vi.fn()

beforeEach(() => {
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
  anchorClick.mockClear()
  // jsdom has no URL.createObjectURL; tests stub it so downloadBlob can run.
  URL.createObjectURL = createObjectURL
  URL.revokeObjectURL = revokeObjectURL
  // Keep jsdom from emitting "navigation not implemented" on the download click.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(anchorClick)
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** jsdom's Blob has no text()/arrayBuffer(); FileReader is the reliable read path. */
function blobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

function renderCard(repo: FakeRepository) {
  return render(
    <RepositoryProvider initialRepo={repo}>
      <ExportCard />
    </RepositoryProvider>,
  )
}

async function seedRepo(repo: FakeRepository) {
  await repo.setProfile({
    theme: 'dark',
    jarDefaultSpoons: 10,
    jarResetHour: 0,
    onboardingDone: true,
    localDataImportedAt: null,
  })
  await repo.setPins(['home', 'jar'])
  await repo.addJarLog({ date: '2026-08-17', spent: 2.5, label: 'Busy day' })
}

describe('ExportCard', () => {
  it('exports the full bundle as a downloadable JSON file', async () => {
    const repo = new FakeRepository()
    await seedRepo(repo)
    renderCard(repo)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Export JSON' }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/json')
    const parsed = JSON.parse(await blobText(blob)) as {
      profile: { theme: string } | null
      jarLogs: { date: string; spent: number; label: string | null }[]
    }
    expect(parsed.profile?.theme).toBe('dark')
    expect(parsed.jarLogs).toHaveLength(1)
    expect(parsed.jarLogs[0]).toMatchObject({ date: '2026-08-17', spent: 2.5, label: 'Busy day' })
    expect(anchorClick).toHaveBeenCalledTimes(1)
    const anchor = anchorClick.mock.instances[0] as HTMLAnchorElement
    expect(anchor.href).toBe('blob:mock')
    expect(anchor.download).toMatch(/^steady-export-\d{4}-\d{2}-\d{2}\.json$/)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('exports jar logs as CSV with a header row', async () => {
    const repo = new FakeRepository()
    await seedRepo(repo)
    renderCard(repo)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/csv')
    const text = await blobText(blob)
    expect(text.startsWith('date,spent,label')).toBe(true)
    expect(text).toContain('2026-08-17,2.5,Busy day')
    const anchor = anchorClick.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toMatch(/^steady-jar-logs-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})