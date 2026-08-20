/**
 * Guest-mode repository backed by Dexie (IndexedDB). Behaviorally identical
 * to SupabaseRepository — both are exercised by tests/parity.suite.ts.
 *
 * Image blobs live in the `images` store; blob: URLs are transient, so
 * `listImages` recreates them on every read and `deleteImage` revokes them.
 */
import type { ToolboxRepository } from '../repository'
import type {
  ExportBundle,
  ImageRef,
  JarDay,
  JarLog,
  JarLogInput,
  Profile,
  TimelineEntry,
  TimelineEntryInput,
  TimelineZone,
  TimelineZoneInput,
} from '../types'
import { assertImageAllowed, MAX_IMAGES_PER_ENTRY } from '../imageRules'
import { createSteadyDB, type SteadyDB } from './db'

function blobUrl(blob: Blob): string {
  if (typeof URL.createObjectURL === 'function') return URL.createObjectURL(blob)
  return `blob:steady/${crypto.randomUUID()}`
}

function revokeBlobUrl(url: string): void {
  if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

export class LocalRepository implements ToolboxRepository {
  private db: SteadyDB

  constructor(db: SteadyDB = createSteadyDB()) {
    this.db = db
  }

  async getProfile(): Promise<Profile | null> {
    const row = await this.db.profiles.get('profile')
    return row?.value ?? null
  }

  async setProfile(p: Profile): Promise<void> {
    await this.db.profiles.put({ key: 'profile', value: p })
  }

  async getPins(): Promise<string[]> {
    const row = await this.db.pins.get('pins')
    return row?.value ?? []
  }

  async setPins(ids: string[]): Promise<void> {
    await this.db.pins.put({ key: 'pins', value: ids })
  }

  async getJarDay(date: string): Promise<JarDay | null> {
    return (await this.db.jarDays.get(date)) ?? null
  }

  async upsertJarDay(d: JarDay): Promise<void> {
    await this.db.jarDays.put(d)
  }

  async listJarLogs(): Promise<JarLog[]> {
    const logs = await this.db.jarLogs.toArray()
    return logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async addJarLog(l: JarLogInput): Promise<JarLog> {
    const log: JarLog = {
      id: crypto.randomUUID(),
      date: l.date,
      spent: l.spent,
      label: l.label ?? null,
      createdAt: new Date().toISOString(),
    }
    await this.db.jarLogs.put(log)
    return log
  }

  async updateJarLog(id: string, l: JarLogInput): Promise<void> {
    const existing = await this.db.jarLogs.get(id)
    if (!existing) throw new Error(`JarLog ${id} not found`)
    await this.db.jarLogs.put({ ...existing, date: l.date, spent: l.spent, label: l.label ?? null })
  }

  async deleteJarLog(id: string): Promise<void> {
    await this.db.jarLogs.delete(id)
  }

  async listTimelineEntries(): Promise<TimelineEntry[]> {
    const entries = await this.db.timelineEntries.toArray()
    return entries.sort(
      (a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt.localeCompare(b.createdAt),
    )
  }

  async saveTimelineEntry(e: TimelineEntryInput): Promise<TimelineEntry> {
    if (e.id) {
      const existing = await this.db.timelineEntries.get(e.id)
      if (existing) {
        const updated: TimelineEntry = {
          ...existing,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate ?? null,
          description: e.description ?? '',
          color: e.color,
          displayMode: e.displayMode ?? 'card',
        }
        await this.db.timelineEntries.put(updated)
        return updated
      }
      const entry: TimelineEntry = {
        id: e.id,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        description: e.description ?? '',
        color: e.color,
        displayMode: e.displayMode ?? 'card',
        createdAt: new Date().toISOString(),
      }
      await this.db.timelineEntries.put(entry)
      return entry
    }
    const entry: TimelineEntry = {
      id: crypto.randomUUID(),
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate ?? null,
      description: e.description ?? '',
      color: e.color,
      displayMode: e.displayMode ?? 'card',
      createdAt: new Date().toISOString(),
    }
    await this.db.timelineEntries.put(entry)
    return entry
  }

  async deleteTimelineEntry(id: string): Promise<void> {
    await this.db.timelineEntries.delete(id)
    await this.db.images.where('entryId').equals(id).delete()
  }

  async listZones(): Promise<TimelineZone[]> {
    const zones = await this.db.timelineZones.toArray()
    return zones.sort((a, b) => a.startDate.localeCompare(b.startDate))
  }

  async saveZone(z: TimelineZoneInput): Promise<TimelineZone> {
    if (z.id) {
      const existing = await this.db.timelineZones.get(z.id)
      if (existing) {
        const updated: TimelineZone = {
          ...existing,
          name: z.name,
          color: z.color,
          startDate: z.startDate,
          endDate: z.endDate ?? null,
        }
        await this.db.timelineZones.put(updated)
        return updated
      }
      const zone: TimelineZone = {
        id: z.id,
        name: z.name,
        color: z.color,
        startDate: z.startDate,
        endDate: z.endDate ?? null,
        createdAt: new Date().toISOString(),
      }
      await this.db.timelineZones.put(zone)
      return zone
    }
    const zone: TimelineZone = {
      id: crypto.randomUUID(),
      name: z.name,
      color: z.color,
      startDate: z.startDate,
      endDate: z.endDate ?? null,
      createdAt: new Date().toISOString(),
    }
    await this.db.timelineZones.put(zone)
    return zone
  }

  async deleteZone(id: string): Promise<void> {
    await this.db.timelineZones.delete(id)
  }

  async listImages(entryId: string): Promise<ImageRef[]> {
    const images = await this.db.images.where('entryId').equals(entryId).toArray()
    return images
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((img) => ({ id: img.id, entryId: img.entryId, url: blobUrl(img.blob), createdAt: img.createdAt }))
  }

  async uploadImage(file: File, entryId: string): Promise<ImageRef> {
    assertImageAllowed(file)
    const count = await this.db.images.where('entryId').equals(entryId).count()
    if (count >= MAX_IMAGES_PER_ENTRY) throw new Error(`Max ${MAX_IMAGES_PER_ENTRY} images per entry`)
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    await this.db.images.put({ id, entryId, blob: file, createdAt })
    return { id, entryId, url: blobUrl(file), createdAt }
  }

  async deleteImage(ref: ImageRef): Promise<void> {
    revokeBlobUrl(ref.url)
    await this.db.images.delete(ref.id)
  }

  async exportAll(): Promise<ExportBundle> {
    const [profile, pins, jarDays, jarLogs, timelineEntries, timelineZones, images] = await Promise.all([
      this.getProfile(),
      this.getPins(),
      this.db.jarDays.toArray(),
      this.db.jarLogs.toArray(),
      this.db.timelineEntries.toArray(),
      this.db.timelineZones.toArray(),
      this.db.images.toArray(),
    ])
    return {
      exportedAt: new Date().toISOString(),
      profile,
      pins,
      jarDays,
      jarLogs,
      timelineEntries,
      timelineZones,
      timelineImages: images.map((img) => ({
        id: img.id,
        entryId: img.entryId,
        storagePath: img.id,
        createdAt: img.createdAt,
      })),
    }
  }

  async deleteAllData(): Promise<void> {
    await Promise.all([
      this.db.profiles.clear(),
      this.db.pins.clear(),
      this.db.jarDays.clear(),
      this.db.jarLogs.clear(),
      this.db.timelineEntries.clear(),
      this.db.timelineZones.clear(),
      this.db.images.clear(),
    ])
  }
}