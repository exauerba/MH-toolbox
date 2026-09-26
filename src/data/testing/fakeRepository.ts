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
  BreatheCheckin,
  BreatheCheckinInput,
  BreatheDoseLog,
  BreatheDoseLogInput,
  BreatheMed,
  BreatheMedInput,
  ExportBundle,
  ImageRef,
  JarDay,
  JarLog,
  JarLogInput,
  LanternLevel,
  LanternScale,
  LanternScaleInput,
  LanternShare,
  Profile,
  TimelineEntry,
  TimelineEntryInput,
  TimelineZone,
  TimelineZoneInput,
} from '../types'
import { assertImageAllowed, MAX_IMAGES_PER_ENTRY, MAX_IMAGES_PER_LEVEL } from '../imageRules'

export class FakeRepository implements ToolboxRepository {
  profile: Profile | null = null
  pins: string[] = []
  jarDays = new Map<string, JarDay>()
  jarLogs = new Map<string, JarLog>()
  timelineEntries = new Map<string, TimelineEntry>()
  timelineZones = new Map<string, TimelineZone>()
  images = new Map<string, ImageRef>()
  breatheMeds = new Map<string, BreatheMed>()
  breatheCheckins = new Map<string, BreatheCheckin>()
  breatheDoseLogs = new Map<string, BreatheDoseLog>()
  lanternScale: LanternScale | null = null
  lanternLevels = new Map<string, LanternLevel & { scaleId: string }>()
  lanternImages = new Map<string, ImageRef>()
  lanternShares = new Map<string, LanternShare>()

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
    // Backfill displayMode for entries created before the field existed.
    return [...this.timelineEntries.values()]
      .map((e) => ({ ...e, displayMode: e.displayMode ?? 'card' }))
      .sort(
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
          displayMode: e.displayMode ?? 'card',
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
        displayMode: e.displayMode ?? 'card',
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
      displayMode: e.displayMode ?? 'card',
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

  async listBreatheMeds(): Promise<BreatheMed[]> {
    return [...this.breatheMeds.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async saveBreatheMed(m: BreatheMedInput, existingId?: string): Promise<BreatheMed> {
    if (existingId) {
      const existing = this.breatheMeds.get(existingId)
      if (existing) {
        const updated: BreatheMed = {
          ...existing,
          name: m.name,
          medType: m.medType ?? existing.medType,
          reminderHour: m.reminderHour !== undefined ? (m.reminderHour ?? null) : existing.reminderHour,
        }
        this.breatheMeds.set(existingId, updated)
        return updated
      }
      const med: BreatheMed = {
        id: existingId,
        name: m.name,
        medType: m.medType ?? 'controller',
        reminderHour: m.reminderHour ?? null,
        createdAt: new Date().toISOString(),
      }
      this.breatheMeds.set(med.id, med)
      return med
    }
    const med: BreatheMed = {
      id: crypto.randomUUID(),
      name: m.name,
      medType: m.medType ?? 'controller',
      reminderHour: m.reminderHour ?? null,
      createdAt: new Date().toISOString(),
    }
    this.breatheMeds.set(med.id, med)
    return med
  }

  async deleteBreatheMed(id: string): Promise<void> {
    this.breatheMeds.delete(id)
  }

  async listBreatheCheckins(): Promise<BreatheCheckin[]> {
    return [...this.breatheCheckins.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async saveBreatheCheckin(c: BreatheCheckinInput, existingId?: string): Promise<BreatheCheckin> {
    if (existingId) {
      const existing = this.breatheCheckins.get(existingId)
      if (existing) {
        const updated: BreatheCheckin = {
          ...existing,
          date: c.date,
          peakFlow: c.peakFlow !== undefined ? (c.peakFlow ?? null) : existing.peakFlow,
          symptoms: c.symptoms !== undefined ? (c.symptoms ?? null) : existing.symptoms,
          sleep: c.sleep !== undefined ? (c.sleep ?? null) : existing.sleep,
          activity: c.activity !== undefined ? (c.activity ?? null) : existing.activity,
          note: c.note !== undefined ? (c.note ?? null) : existing.note,
        }
        this.breatheCheckins.set(existingId, updated)
        return updated
      }
      const checkin: BreatheCheckin = {
        id: existingId,
        date: c.date,
        peakFlow: c.peakFlow ?? null,
        symptoms: c.symptoms ?? null,
        sleep: c.sleep ?? null,
        activity: c.activity ?? null,
        note: c.note ?? null,
        createdAt: new Date().toISOString(),
      }
      this.breatheCheckins.set(checkin.id, checkin)
      return checkin
    }
    const checkin: BreatheCheckin = {
      id: crypto.randomUUID(),
      date: c.date,
      peakFlow: c.peakFlow ?? null,
      symptoms: c.symptoms ?? null,
      sleep: c.sleep ?? null,
      activity: c.activity ?? null,
      note: c.note ?? null,
      createdAt: new Date().toISOString(),
    }
    this.breatheCheckins.set(checkin.id, checkin)
    return checkin
  }

  async deleteBreatheCheckin(id: string): Promise<void> {
    this.breatheCheckins.delete(id)
  }

  async listBreatheDoseLogs(): Promise<BreatheDoseLog[]> {
    // Backfill trigger for rows written before the field existed.
    return [...this.breatheDoseLogs.values()]
      .map((l) => ({ ...l, trigger: l.trigger ?? [] }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async addBreatheDoseLog(d: BreatheDoseLogInput, existingId?: string): Promise<BreatheDoseLog> {
    if (existingId) {
      const existing = this.breatheDoseLogs.get(existingId)
      if (existing) {
        const updated: BreatheDoseLog = {
          ...existing,
          medId: d.medId,
          date: d.date,
          time: d.time ?? null,
          trigger: d.trigger ?? [],
        }
        this.breatheDoseLogs.set(existingId, updated)
        return updated
      }
      const log: BreatheDoseLog = {
        id: existingId,
        medId: d.medId,
        date: d.date,
        time: d.time ?? null,
        trigger: d.trigger ?? [],
        createdAt: new Date().toISOString(),
      }
      this.breatheDoseLogs.set(log.id, log)
      return log
    }
    const log: BreatheDoseLog = {
      id: crypto.randomUUID(),
      medId: d.medId,
      date: d.date,
      time: d.time ?? null,
      trigger: d.trigger ?? [],
      createdAt: new Date().toISOString(),
    }
    this.breatheDoseLogs.set(log.id, log)
    return log
  }

  async deleteBreatheDoseLog(id: string): Promise<void> {
    this.breatheDoseLogs.delete(id)
  }

  async getLanternScale(): Promise<LanternScale | null> {
    const scale = this.lanternScale
    if (!scale) return null
    const levels = [...this.lanternLevels.values()]
      .filter((l) => l.scaleId === scale.id)
      .map(({ scaleId: _scaleId, ...level }) => level)
      .sort((a, b) => a.position - b.position)
    return { ...scale, levels }
  }

  async saveLanternScale(s: LanternScaleInput): Promise<LanternScale> {
    const now = new Date().toISOString()
    let scale: LanternScale
    if (s.id && this.lanternScale) {
      scale = { ...this.lanternScale, name: s.name, levelCount: s.levelCount, updatedAt: now }
    } else if (s.id) {
      scale = {
        id: s.id,
        name: s.name,
        levelCount: s.levelCount,
        levels: [],
        createdAt: now,
        updatedAt: now,
      }
    } else {
      scale = {
        id: crypto.randomUUID(),
        name: s.name,
        levelCount: s.levelCount,
        levels: [],
        createdAt: now,
        updatedAt: now,
      }
    }
    this.lanternScale = scale

    const kept = new Set<string>()
    for (const level of s.levels) {
      this.lanternLevels.set(level.id, { ...level, scaleId: scale.id })
      kept.add(level.id)
    }
    for (const [key, stored] of this.lanternLevels) {
      if (stored.scaleId === scale.id && !kept.has(key)) {
        this.lanternLevels.delete(key)
        for (const [imgKey, img] of this.lanternImages) {
          if (img.entryId === key) this.lanternImages.delete(imgKey)
        }
      }
    }

    return (await this.getLanternScale())!
  }

  async listLanternImages(levelId: string): Promise<ImageRef[]> {
    return [...this.lanternImages.values()]
      .filter((img) => img.entryId === levelId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async uploadLanternImage(file: File, levelId: string): Promise<ImageRef> {
    assertImageAllowed(file)
    const count = [...this.lanternImages.values()].filter((img) => img.entryId === levelId).length
    if (count >= MAX_IMAGES_PER_LEVEL) throw new Error(`Max ${MAX_IMAGES_PER_LEVEL} images per level`)
    const id = crypto.randomUUID()
    const ref: ImageRef = { id, entryId: levelId, url: `fake://image/${id}`, createdAt: new Date().toISOString() }
    this.lanternImages.set(id, ref)
    return ref
  }

  async deleteLanternImage(ref: ImageRef): Promise<void> {
    this.lanternImages.delete(ref.id)
  }

  async listLanternShares(): Promise<LanternShare[]> {
    return [...this.lanternShares.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async createLanternShare(label: string): Promise<LanternShare> {
    const share: LanternShare = {
      id: crypto.randomUUID(),
      label,
      token: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      revokedAt: null,
    }
    this.lanternShares.set(share.id, share)
    return share
  }

  async revokeLanternShare(id: string): Promise<void> {
    const share = this.lanternShares.get(id)
    if (share) {
      this.lanternShares.set(id, { ...share, revokedAt: new Date().toISOString() })
    }
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
      breatheMeds: [...this.breatheMeds.values()],
      breatheCheckins: [...this.breatheCheckins.values()],
      breatheDoseLogs: [...this.breatheDoseLogs.values()],
      lanternScale: await this.getLanternScale(),
      lanternImages: [...this.lanternImages.values()].map((img) => ({
        id: img.id,
        levelId: img.entryId,
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
    this.breatheMeds.clear()
    this.breatheCheckins.clear()
    this.breatheDoseLogs.clear()
    this.lanternScale = null
    this.lanternLevels.clear()
    this.lanternImages.clear()
    this.lanternShares.clear()
  }
}