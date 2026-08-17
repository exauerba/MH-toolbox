import { afterEach, describe, expect, it, vi } from 'vitest'
import { migrateLocalToSupabase } from '../src/data/migrateLocal'
import { FakeRepository } from '../src/data/testing/fakeRepository'

const zeroCounts = {
  profiles: 0,
  pins: 0,
  jarDays: 0,
  jarLogs: 0,
  timelineEntries: 0,
  timelineZones: 0,
  timelineImages: 0,
}

function mockFetchResolves(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ blob: () => Promise.resolve(new Blob(['x'], { type: 'image/png' })) }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('migrateLocalToSupabase', () => {
  it('migrates all data from local to remote', async () => {
    const local = new FakeRepository()
    const remote = new FakeRepository()

    await local.setProfile({
      theme: 'dark',
      jarDefaultSpoons: 10,
      jarResetHour: 4,
      onboardingDone: true,
      localDataImportedAt: null,
    })
    await local.setPins(['jar', 'timeline'])
    await local.upsertJarDay({ date: '2026-08-16', totalSpoons: 10 })
    await local.addJarLog({ date: '2026-08-16', spent: 2, label: 'work' })
    const entry = await local.saveTimelineEntry({
      id: 'fixed-entry-id',
      title: 'Trip',
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      description: 'details',
      color: '#ff0000',
    })
    const zone = await local.saveZone({
      id: 'fixed-zone-id',
      name: 'Semester',
      color: '#123456',
      startDate: '2026-01-01',
    })
    await local.uploadImage(new File(['x'], 'photo.png', { type: 'image/png' }), entry.id)

    mockFetchResolves()

    const result = await migrateLocalToSupabase(local, remote)

    expect(result.migrated).toBe(true)
    expect(await remote.getProfile()).toEqual({
      theme: 'dark',
      jarDefaultSpoons: 10,
      jarResetHour: 4,
      onboardingDone: true,
      localDataImportedAt: expect.any(String),
    })
    expect(await remote.getPins()).toEqual(['jar', 'timeline'])
    expect(await remote.getJarDay('2026-08-16')).toEqual({ date: '2026-08-16', totalSpoons: 10 })

    const logs = await remote.listJarLogs()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ date: '2026-08-16', spent: 2, label: 'work' })

    const remoteEntries = await remote.listTimelineEntries()
    expect(remoteEntries).toHaveLength(1)
    expect(remoteEntries[0].id).toBe(entry.id)

    const remoteZones = await remote.listZones()
    expect(remoteZones).toHaveLength(1)
    expect(remoteZones[0].id).toBe(zone.id)

    expect(result.counts).toEqual({
      profiles: 1,
      pins: 2,
      jarDays: 1,
      jarLogs: 1,
      timelineEntries: 1,
      timelineZones: 1,
      timelineImages: 1,
    })
  })

  it('is a no-op when already imported', async () => {
    const local = new FakeRepository()
    const remote = new FakeRepository()
    await remote.setProfile({
      theme: 'system',
      jarDefaultSpoons: 12,
      jarResetHour: 0,
      onboardingDone: false,
      localDataImportedAt: '2026-08-16T10:00:00.000Z',
    })

    const result = await migrateLocalToSupabase(local, remote)

    expect(result).toEqual({ migrated: false, reason: 'already-imported', counts: zeroCounts })
  })

  it('is a no-op when local has no data', async () => {
    const local = new FakeRepository()
    const remote = new FakeRepository()

    const result = await migrateLocalToSupabase(local, remote)

    expect(result).toEqual({ migrated: false, reason: 'no-local-data', counts: zeroCounts })
  })

  it('is idempotent on re-run', async () => {
    const local = new FakeRepository()
    const remote = new FakeRepository()
    const entry = await local.saveTimelineEntry({
      id: 'fixed-entry-id',
      title: 'Trip',
      startDate: '2026-01-01',
      color: '#ff0000',
    })

    const first = await migrateLocalToSupabase(local, remote)
    expect(first.migrated).toBe(true)

    const second = await migrateLocalToSupabase(local, remote)
    expect(second).toEqual({ migrated: false, reason: 'already-imported', counts: zeroCounts })

    const entries = await remote.listTimelineEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].id).toBe(entry.id)
  })

  it('re-uploads images via fetch', async () => {
    const local = new FakeRepository()
    const remote = new FakeRepository()
    const entry = await local.saveTimelineEntry({
      id: 'fixed-entry-id',
      title: 'Trip',
      startDate: '2026-01-01',
      color: '#ff0000',
    })
    await local.uploadImage(new File(['x'], 'photo.png', { type: 'image/png' }), entry.id)

    mockFetchResolves()

    const result = await migrateLocalToSupabase(local, remote)

    expect(result.migrated).toBe(true)
    expect(result.counts.timelineImages).toBe(1)
    expect(await remote.listImages(entry.id)).toHaveLength(1)
  })

  it('skips images whose blob url cannot be fetched', async () => {
    const local = new FakeRepository()
    const remote = new FakeRepository()
    await local.setProfile({
      theme: 'dark',
      jarDefaultSpoons: 10,
      jarResetHour: 4,
      onboardingDone: true,
      localDataImportedAt: null,
    })
    const entry = await local.saveTimelineEntry({
      id: 'fixed-entry-id',
      title: 'Trip',
      startDate: '2026-01-01',
      color: '#ff0000',
    })
    await local.uploadImage(new File(['x'], 'photo.png', { type: 'image/png' }), entry.id)

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))

    const result = await migrateLocalToSupabase(local, remote)

    expect(result.migrated).toBe(true)
    expect(result.counts.timelineImages).toBe(0)
    expect(result.counts.profiles).toBe(1)
    expect(await remote.listTimelineEntries()).toHaveLength(1)
  })
})