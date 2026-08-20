/**
 * Guest → account migration.
 *
 * One-time, idempotent import of a guest-mode (local) repository into a
 * signed-in (remote) repository. The local copy is retained. Timeline entry
 * and zone ids are preserved so image references stay valid, and re-runs are
 * safe because saveTimelineEntry/saveZone are upserts.
 */
import type { ToolboxRepository } from './repository'
import type { ExportBundle, Profile } from './types'

export interface MigrationResult {
  migrated: boolean
  reason?: 'already-imported' | 'no-local-data'
  counts: {
    profiles: number
    pins: number
    jarDays: number
    jarLogs: number
    timelineEntries: number
    timelineZones: number
    timelineImages: number
  }
}

const defaultProfile: Profile = {
  theme: 'system',
  jarDefaultSpoons: 12,
  jarResetHour: 0,
  onboardingDone: false,
  localDataImportedAt: null,
}

const zeroCounts = (): MigrationResult['counts'] => ({
  profiles: 0,
  pins: 0,
  jarDays: 0,
  jarLogs: 0,
  timelineEntries: 0,
  timelineZones: 0,
  timelineImages: 0,
})

function hasLocalData(bundle: ExportBundle): boolean {
  return (
    bundle.profile !== null ||
    bundle.pins.length > 0 ||
    bundle.jarDays.length > 0 ||
    bundle.jarLogs.length > 0 ||
    bundle.timelineEntries.length > 0 ||
    bundle.timelineZones.length > 0 ||
    bundle.timelineImages.length > 0
  )
}

export async function migrateLocalToSupabase(
  local: ToolboxRepository,
  remote: ToolboxRepository,
): Promise<MigrationResult> {
  const counts = zeroCounts()

  const remoteProfile = await remote.getProfile()
  if (remoteProfile?.localDataImportedAt) {
    return { migrated: false, reason: 'already-imported', counts }
  }

  const bundle = await local.exportAll()
  if (!hasLocalData(bundle)) {
    return { migrated: false, reason: 'no-local-data', counts }
  }

  if (bundle.profile && !remoteProfile) {
    await remote.setProfile(bundle.profile)
    counts.profiles++
  }

  if (bundle.pins.length > 0 && (await remote.getPins()).length === 0) {
    await remote.setPins(bundle.pins)
    counts.pins = bundle.pins.length
  }

  for (const day of bundle.jarDays) {
    await remote.upsertJarDay(day)
    counts.jarDays++
  }

  for (const log of bundle.jarLogs) {
    await remote.addJarLog({ date: log.date, spent: log.spent, label: log.label })
    counts.jarLogs++
  }

  for (const entry of bundle.timelineEntries) {
    await remote.saveTimelineEntry({
      id: entry.id,
      title: entry.title,
      startDate: entry.startDate,
      endDate: entry.endDate,
      description: entry.description,
      color: entry.color,
      displayMode: entry.displayMode,
    })
    counts.timelineEntries++
  }

  for (const zone of bundle.timelineZones) {
    await remote.saveZone({
      id: zone.id,
      name: zone.name,
      color: zone.color,
      startDate: zone.startDate,
      endDate: zone.endDate,
    })
    counts.timelineZones++
  }

  for (const img of bundle.timelineImages) {
    try {
      const refs = await local.listImages(img.entryId)
      const ref = refs.find((r) => r.id === img.id)
      if (!ref) continue
      const blob = await fetch(ref.url).then((r) => r.blob())
      const file = new File([blob], 'image', { type: blob.type })
      await remote.uploadImage(file, img.entryId)
      counts.timelineImages++
    } catch {
      // Blob unavailable — skip this image rather than failing the migration.
    }
  }

  const current = (await remote.getProfile()) ?? defaultProfile
  await remote.setProfile({ ...current, localDataImportedAt: new Date().toISOString() })

  return { migrated: true, counts }
}