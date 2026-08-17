/**
 * In-memory reference implementation of ToolboxRepository.
 *
 * Mirrors LocalRepository/SupabaseRepository behavior exactly (same ordering,
 * same upsert semantics, same validation) so the parity suite can run against
 * it in unit tests, and features can use it as a test double in component
 * tests without touching IndexedDB or the network.
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

export class FakeRepository implements ToolboxRepository {
  profile: Profile | null = null
  pins: string[] = []
  jarDays = new Map<string, JarDay>()
  jarLogs = new Map<string, JarLog>()
  timelineEntries = new Map<string, TimelineEntry>()
  timelineZones = new Map<string, TimelineZone>()
  images = new Map<string, ImageRef>()

  async getProfile(): Promise<Profile | null> {
    return this.profile
  }

  async setProfile(p: Profile): Promise<void> {
    this.profile = p
  }

  async getPins(): Promise<string[]> {
    return [...this.pins]
  }

  async setPins(ids: string[]): Promise<void> {
    this.pins = [...ids]
  }

  async getJarDay(date: string): Promise<JarDay | null> {
    return this.jarDays.get(date) ?? null
  }

  async upsertJarDay(d: JarDay): Promise<void> {
    this.jarDays.set(d.date, d)
  }

  async listJarLogs(): Promise<JarLog[]> {
    return [...this.jarLogs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async addJarLog(l: JarLogInput): Promise<JarLog> {
    const log: JarLog = {
      id: crypto.randomUUID(),
      date: l.date,
      spent: l.spent,
      label: l.label ?? null,
      createdAt: new Date().toISOString(),
    }
    this.jarLogs.set(log.id, log)
    return log
  }

  async updateJarLog(id: string, l: JarLogInput): Promise<void> {
    const existing = this.jarLogs.get(id)
    if (!existing) throw new Error(`JarLog ${id} not found`)
    this.jarLogs.set(id, { ...existing, date: l.date, spent: l.spent, label: l.label ?? null })
  }

  async deleteJarLog(id: string): Promise<void> {
    this.jarLogs.delete(id)
  }

  async listTimelineEntries(): Promise<TimelineEntry[]> {
    return [...this.timelineEntries.values()].sort(
      (a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt.localeCompare(b.createdAt),
    )
  }

  async saveTimelineEntry(e: TimelineEntryInput): Promise<TimelineEntry> {
    if (e.id) {
      const existing = this.timelineEntries.get(e.id)
      if (existing) {
        const updated: TimelineEntry = {
          ...existing,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate ?? null,
          description: e.description ?? '',
          color: e.color,
        }
        this.timelineEntries.set(e.id, updated)
        return updated
      }
      const entry: TimelineEntry = {
        id: e.id,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        description: e.description ?? '',
        color: e.color,
        createdAt: new Date().toISOString(),
      }
      this.timelineEntries.set(entry.id, entry)
      return entry
    }
    const entry: TimelineEntry = {
      id: crypto.randomUUID(),
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate ?? null,
      description: e.description ?? '',
      color: e.color,
      createdAt: new Date().toISOString(),
    }
    this.timelineEntries.set(entry.id, entry)
    return entry
  }

  async deleteTimelineEntry(id: string): Promise<void> {
    this.timelineEntries.delete(id)
    for (const [key, img] of this.images) {
      if (img.entryId === id) this.images.delete(key)
    }
  }

  async listZones(): Promise<TimelineZone[]> {
    return [...this.timelineZones.values()].sort((a, b) => a.startDate.localeCompare(b.startDate))
  }

  async saveZone(z: TimelineZoneInput): Promise<TimelineZone> {
    if (z.id) {
      const existing = this.timelineZones.get(z.id)
      if (existing) {
        const updated: TimelineZone = {
          ...existing,
          name: z.name,
          color: z.color,
          startDate: z.startDate,
          endDate: z.endDate ?? null,
        }
        this.timelineZones.set(z.id, updated)
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
      this.timelineZones.set(zone.id, zone)
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
    this.timelineZones.set(zone.id, zone)
    return zone
  }

  async deleteZone(id: string): Promise<void> {
    this.timelineZones.delete(id)
  }

  async listImages(entryId: string): Promise<ImageRef[]> {
    return [...this.images.values()]
      .filter((img) => img.entryId === entryId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async uploadImage(file: File, entryId: string): Promise<ImageRef> {
    assertImageAllowed(file)
    const count = [...this.images.values()].filter((img) => img.entryId === entryId).length
    if (count >= MAX_IMAGES_PER_ENTRY) throw new Error(`Max ${MAX_IMAGES_PER_ENTRY} images per entry`)
    const id = crypto.randomUUID()
    const ref: ImageRef = { id, entryId, url: `fake://image/${id}`, createdAt: new Date().toISOString() }
    this.images.set(id, ref)
    return ref
  }

  async deleteImage(ref: ImageRef): Promise<void> {
    this.images.delete(ref.id)
  }

  async exportAll(): Promise<ExportBundle> {
    return {
      exportedAt: new Date().toISOString(),
      profile: this.profile,
      pins: [...this.pins],
      jarDays: [...this.jarDays.values()],
      jarLogs: [...this.jarLogs.values()],
      timelineEntries: [...this.timelineEntries.values()],
      timelineZones: [...this.timelineZones.values()],
      timelineImages: [...this.images.values()].map((img) => ({
        id: img.id,
        entryId: img.entryId,
        storagePath: img.storagePath ?? img.id,
        createdAt: img.createdAt,
      })),
    }
  }

  async deleteAllData(): Promise<void> {
    this.profile = null
    this.pins = []
    this.jarDays.clear()
    this.jarLogs.clear()
    this.timelineEntries.clear()
    this.timelineZones.clear()
    this.images.clear()
  }
}