/**
 * Shared behavioral suite for ToolboxRepository.
 *
 * Every implementation (fake, Dexie, Supabase) must pass this suite — it is
 * the executable form of the §2.1 contract. `setup` returns a fresh,
 * empty repository (and optional teardown, e.g. deleting a test user).
 */
import type { ToolboxRepository } from '../src/data/repository'
import type { Profile } from '../src/data/types'

export interface RepositorySetup {
  repo: ToolboxRepository
  teardown?: () => Promise<void>
}

export function runRepositorySuite(
  name: string,
  setup: () => Promise<RepositorySetup> | RepositorySetup,
): void {
  describe(`ToolboxRepository parity — ${name}`, () => {
    let repo: ToolboxRepository
    let teardown: (() => Promise<void>) | undefined

    beforeEach(async () => {
      const s = await setup()
      repo = s.repo
      teardown = s.teardown
    })

    afterEach(async () => {
      await teardown?.()
    })

    it('starts empty', async () => {
      expect(await repo.getProfile()).toBeNull()
      expect(await repo.getPins()).toEqual([])
      expect(await repo.getJarDay('2026-08-16')).toBeNull()
      expect(await repo.listJarLogs()).toEqual([])
      expect(await repo.listTimelineEntries()).toEqual([])
      expect(await repo.listZones()).toEqual([])
    })

    it('round-trips a profile', async () => {
      const p: Profile = {
        theme: 'dark',
        jarDefaultSpoons: 10,
        jarResetHour: 4,
        onboardingDone: true,
        localDataImportedAt: null,
      }
      await repo.setProfile(p)
      expect(await repo.getProfile()).toEqual(p)

      await repo.setProfile({ ...p, theme: 'light', localDataImportedAt: '2026-08-16T10:00:00.000Z' })
      expect(await repo.getProfile()).toEqual({
        theme: 'light',
        jarDefaultSpoons: 10,
        jarResetHour: 4,
        onboardingDone: true,
        localDataImportedAt: '2026-08-16T10:00:00.000Z',
      })
    })

    it('round-trips pins in order', async () => {
      await repo.setPins(['jar', 'timeline', 'bloom'])
      expect(await repo.getPins()).toEqual(['jar', 'timeline', 'bloom'])
      await repo.setPins(['bloom'])
      expect(await repo.getPins()).toEqual(['bloom'])
      await repo.setPins([])
      expect(await repo.getPins()).toEqual([])
    })

    it('upserts jar days', async () => {
      await repo.upsertJarDay({ date: '2026-08-16', totalSpoons: 12 })
      expect(await repo.getJarDay('2026-08-16')).toEqual({ date: '2026-08-16', totalSpoons: 12 })
      await repo.upsertJarDay({ date: '2026-08-16', totalSpoons: 9 })
      expect(await repo.getJarDay('2026-08-16')).toEqual({ date: '2026-08-16', totalSpoons: 9 })
      expect(await repo.getJarDay('2026-08-17')).toBeNull()
    })

    it('adds, lists, updates, and deletes jar logs', async () => {
      const l1 = await repo.addJarLog({ date: '2026-08-16', spent: 2, label: 'work' })
      const l2 = await repo.addJarLog({ date: '2026-08-16', spent: 1.5 })
      expect(l1.id).toBeTruthy()
      expect(l1.createdAt).toBeTruthy()
      expect(l1.label).toBe('work')
      expect(l2.label).toBeNull()

      const logs = await repo.listJarLogs()
      expect(logs).toHaveLength(2)
      // newest first (ties allowed — createdAt must be non-increasing)
      for (let i = 1; i < logs.length; i++) {
        expect(logs[i - 1].createdAt >= logs[i].createdAt).toBe(true)
      }

      await repo.updateJarLog(l1.id, { date: '2026-08-16', spent: 3, label: 'work + errands' })
      const updated = (await repo.listJarLogs()).find((l) => l.id === l1.id)!
      expect(updated.spent).toBe(3)
      expect(updated.label).toBe('work + errands')
      expect(updated.createdAt).toBe(l1.createdAt) // createdAt preserved on update

      await repo.deleteJarLog(l1.id)
      expect(await repo.listJarLogs()).toHaveLength(1)
    })

    it('creates and updates timeline entries', async () => {
      const e = await repo.saveTimelineEntry({ title: 'First', startDate: '2026-01-01', color: '#ff0000' })
      expect(e.id).toBeTruthy()
      expect(e.endDate).toBeNull()
      expect(e.description).toBe('')
      expect(e.displayMode).toBe('card') // defaults to card

      const updated = await repo.saveTimelineEntry({
        id: e.id,
        title: 'First (edited)',
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        description: 'details',
        color: '#00ff00',
        displayMode: 'compact',
      })
      expect(updated.id).toBe(e.id)
      expect(updated.title).toBe('First (edited)')
      expect(updated.endDate).toBe('2026-02-01')
      expect(updated.description).toBe('details')
      expect(updated.displayMode).toBe('compact')
      expect(updated.createdAt).toBe(e.createdAt) // createdAt preserved on update

      expect(await repo.listTimelineEntries()).toHaveLength(1)
    })

    it('upserts a timeline entry with a fixed id', async () => {
      const created = await repo.saveTimelineEntry({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Seeded',
        startDate: '2026-01-01',
        color: '#000',
        displayMode: 'compact',
      })
      expect(created.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(created.displayMode).toBe('compact')
      expect(await repo.listTimelineEntries()).toHaveLength(1)

      const updated = await repo.saveTimelineEntry({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Seeded (edited)',
        startDate: '2026-01-01',
        color: '#fff',
        displayMode: 'compact',
      })
      expect(updated.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(updated.title).toBe('Seeded (edited)')
      expect(updated.displayMode).toBe('compact')
      expect(updated.createdAt).toBe(created.createdAt)
      expect(await repo.listTimelineEntries()).toHaveLength(1)
    })

    it('orders timeline entries by startDate', async () => {
      const a = await repo.saveTimelineEntry({ title: 'A', startDate: '2026-03-01', color: '#000' })
      const b = await repo.saveTimelineEntry({ title: 'B', startDate: '2026-01-01', color: '#000' })
      const c = await repo.saveTimelineEntry({ title: 'C', startDate: '2026-02-01', color: '#000' })
      const all = await repo.listTimelineEntries()
      expect(all.map((x) => x.title)).toEqual(['B', 'C', 'A'])
      expect(all.map((x) => x.id)).toEqual([b.id, c.id, a.id])
    })

    it('deletes timeline entries', async () => {
      const e = await repo.saveTimelineEntry({ title: 'X', startDate: '2026-01-01', color: '#000' })
      await repo.deleteTimelineEntry(e.id)
      expect(await repo.listTimelineEntries()).toEqual([])
    })

    it('creates, updates, and deletes zones', async () => {
      const z = await repo.saveZone({ name: 'Semester', color: '#123456', startDate: '2026-01-01' })
      expect(z.id).toBeTruthy()
      expect(z.endDate).toBeNull()

      const updated = await repo.saveZone({
        id: z.id,
        name: 'Semester 2',
        color: '#654321',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      })
      expect(updated.name).toBe('Semester 2')
      expect(updated.endDate).toBe('2026-06-30')
      expect(updated.createdAt).toBe(z.createdAt)

      expect(await repo.listZones()).toHaveLength(1)
      await repo.deleteZone(z.id)
      expect(await repo.listZones()).toEqual([])
    })

    it('upserts a zone with a fixed id', async () => {
      const created = await repo.saveZone({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Seeded zone',
        color: '#000',
        startDate: '2026-01-01',
      })
      expect(created.id).toBe('550e8400-e29b-41d4-a716-446655440001')
      expect(await repo.listZones()).toHaveLength(1)

      const updated = await repo.saveZone({
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Seeded zone (edited)',
        color: '#fff',
        startDate: '2026-01-01',
      })
      expect(updated.id).toBe('550e8400-e29b-41d4-a716-446655440001')
      expect(updated.name).toBe('Seeded zone (edited)')
      expect(updated.createdAt).toBe(created.createdAt)
      expect(await repo.listZones()).toHaveLength(1)
    })

    it('uploads, lists, and deletes images', async () => {
      const e = await repo.saveTimelineEntry({ title: 'With image', startDate: '2026-01-01', color: '#000' })
      const file = new File(['fake-image-bytes'], 'photo.png', { type: 'image/png' })
      const ref = await repo.uploadImage(file, e.id)
      expect(ref.id).toBeTruthy()
      expect(ref.entryId).toBe(e.id)
      expect(ref.url).toBeTruthy()
      expect(ref.createdAt).toBeTruthy()

      const images = await repo.listImages(e.id)
      expect(images).toHaveLength(1)
      expect(images[0].id).toBe(ref.id)

      await repo.deleteImage(ref)
      expect(await repo.listImages(e.id)).toEqual([])
    })

    it('rejects unsupported image types', async () => {
      const e = await repo.saveTimelineEntry({ title: 'T', startDate: '2026-01-01', color: '#000' })
      const bad = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
      await expect(repo.uploadImage(bad, e.id)).rejects.toThrow(/Unsupported image type/)
    })

    it('deleting an entry removes its images', async () => {
      const e = await repo.saveTimelineEntry({ title: 'Temp', startDate: '2026-01-01', color: '#000' })
      await repo.uploadImage(new File(['x'], 'a.png', { type: 'image/png' }), e.id)
      await repo.deleteTimelineEntry(e.id)
      expect(await repo.listImages(e.id)).toEqual([])
    })

    it('exports everything', async () => {
      await repo.setProfile({
        theme: 'system',
        jarDefaultSpoons: 12,
        jarResetHour: 0,
        onboardingDone: false,
        localDataImportedAt: null,
      })
      await repo.setPins(['jar'])
      await repo.upsertJarDay({ date: '2026-08-16', totalSpoons: 12 })
      await repo.addJarLog({ date: '2026-08-16', spent: 2 })
      await repo.saveTimelineEntry({ title: 'T', startDate: '2026-01-01', color: '#000' })
      await repo.saveZone({ name: 'Z', color: '#000', startDate: '2026-01-01' })

      const bundle = await repo.exportAll()
      expect(bundle.exportedAt).toBeTruthy()
      expect(bundle.profile?.theme).toBe('system')
      expect(bundle.pins).toEqual(['jar'])
      expect(bundle.jarDays).toHaveLength(1)
      expect(bundle.jarLogs).toHaveLength(1)
      expect(bundle.timelineEntries).toHaveLength(1)
      expect(bundle.timelineZones).toHaveLength(1)
      expect(bundle.timelineImages).toEqual([])
    })

    it('wipes all data', async () => {
      await repo.setProfile({
        theme: 'system',
        jarDefaultSpoons: 12,
        jarResetHour: 0,
        onboardingDone: false,
        localDataImportedAt: null,
      })
      await repo.setPins(['jar'])
      await repo.addJarLog({ date: '2026-08-16', spent: 1 })
      const e = await repo.saveTimelineEntry({ title: 'T', startDate: '2026-01-01', color: '#000' })
      await repo.uploadImage(new File(['x'], 'a.png', { type: 'image/png' }), e.id)

      await repo.deleteAllData()
      expect(await repo.getProfile()).toBeNull()
      expect(await repo.getPins()).toEqual([])
      expect(await repo.listJarLogs()).toEqual([])
      expect(await repo.listTimelineEntries()).toEqual([])
      expect(await repo.listZones()).toEqual([])
      expect(await repo.listImages(e.id)).toEqual([])
    })
  })
}