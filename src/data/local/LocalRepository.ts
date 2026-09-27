/**
 * Guest-mode repository backed by Dexie (IndexedDB). Behaviorally identical
 * to SupabaseRepository — both are exercised by tests/parity.suite.ts.
 *
 * Image blobs live in the `images` store; blob: URLs are transient, so
 * `listImages` recreates them on every read and `deleteImage` revokes them.
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
  LanternCurrentLevel,
  LanternPartnership,
  LanternScale,
  LanternScaleInput,
  LanternShare,
  PartnerStatus,
  Profile,
  TimelineEntry,
  TimelineEntryInput,
  TimelineZone,
  TimelineZoneInput,
} from '../types'
import { assertImageAllowed, MAX_IMAGES_PER_ENTRY, MAX_IMAGES_PER_LEVEL } from '../imageRules'
import { currentLevelExpiresAt } from '../lanternTtl'
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
    // Backfill displayMode for rows written before the field existed.
    return entries
      .map((e) => ({ ...e, displayMode: e.displayMode ?? 'card' }))
      .sort(
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

  /* ---- Breathe ---------------------------------------------------- */

  async listBreatheMeds(): Promise<BreatheMed[]> {
    const meds = await this.db.breatheMeds.toArray()
    return meds.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async saveBreatheMed(m: BreatheMedInput, existingId?: string): Promise<BreatheMed> {
    if (existingId) {
      const existing = await this.db.breatheMeds.get(existingId)
      if (existing) {
        const updated: BreatheMed = {
          ...existing,
          name: m.name,
          medType: m.medType ?? existing.medType,
          reminderHour: m.reminderHour !== undefined ? (m.reminderHour ?? null) : existing.reminderHour,
        }
        await this.db.breatheMeds.put(updated)
        return updated
      }
      const med: BreatheMed = {
        id: existingId,
        name: m.name,
        medType: m.medType ?? 'controller',
        reminderHour: m.reminderHour ?? null,
        createdAt: new Date().toISOString(),
      }
      await this.db.breatheMeds.put(med)
      return med
    }
    const med: BreatheMed = {
      id: crypto.randomUUID(),
      name: m.name,
      medType: m.medType ?? 'controller',
      reminderHour: m.reminderHour ?? null,
      createdAt: new Date().toISOString(),
    }
    await this.db.breatheMeds.put(med)
    return med
  }

  async deleteBreatheMed(id: string): Promise<void> {
    await this.db.breatheMeds.delete(id)
  }

  async listBreatheCheckins(): Promise<BreatheCheckin[]> {
    const checkins = await this.db.breatheCheckins.toArray()
    return checkins.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async saveBreatheCheckin(c: BreatheCheckinInput, existingId?: string): Promise<BreatheCheckin> {
    if (existingId) {
      const existing = await this.db.breatheCheckins.get(existingId)
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
        await this.db.breatheCheckins.put(updated)
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
      await this.db.breatheCheckins.put(checkin)
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
    await this.db.breatheCheckins.put(checkin)
    return checkin
  }

  async deleteBreatheCheckin(id: string): Promise<void> {
    await this.db.breatheCheckins.delete(id)
  }

  async listBreatheDoseLogs(): Promise<BreatheDoseLog[]> {
    const logs = await this.db.breatheDoseLogs.toArray()
    // Backfill trigger for rows written before the field existed.
    return logs
      .map((l) => ({ ...l, trigger: l.trigger ?? [] }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async addBreatheDoseLog(d: BreatheDoseLogInput, existingId?: string): Promise<BreatheDoseLog> {
    if (existingId) {
      const existing = await this.db.breatheDoseLogs.get(existingId)
      if (existing) {
        const updated: BreatheDoseLog = {
          ...existing,
          medId: d.medId,
          date: d.date,
          time: d.time ?? null,
          trigger: d.trigger ?? [],
        }
        await this.db.breatheDoseLogs.put(updated)
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
      await this.db.breatheDoseLogs.put(log)
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
    await this.db.breatheDoseLogs.put(log)
    return log
  }

  async deleteBreatheDoseLog(id: string): Promise<void> {
    await this.db.breatheDoseLogs.delete(id)
  }

  /* ---- Lantern ---------------------------------------------------- */

  async getLanternScale(): Promise<LanternScale | null> {
    const scale = await this.db.lanternScales.toCollection().first()
    if (!scale) return null
    const levels = await this.db.lanternLevels.where('scaleId').equals(scale.id).toArray()
    return {
      ...scale,
      levels: levels
        .map(({ scaleId: _scaleId, ...level }) => level)
        .sort((a, b) => a.position - b.position),
    }
  }

  async saveLanternScale(s: LanternScaleInput): Promise<LanternScale> {
    let id: string
    let createdAt: string
    if (s.id) {
      const existing = await this.db.lanternScales.get(s.id)
      if (existing) {
        id = existing.id
        createdAt = existing.createdAt
      } else {
        id = s.id
        createdAt = new Date().toISOString()
      }
    } else {
      id = crypto.randomUUID()
      createdAt = new Date().toISOString()
    }
    await this.db.lanternScales.put({
      id,
      name: s.name,
      levelCount: s.levelCount,
      levels: s.levels,
      createdAt,
      updatedAt: new Date().toISOString(),
    })

    await Promise.all(s.levels.map((l) => this.db.lanternLevels.put({ ...l, scaleId: id })))

    const keepIds = new Set(s.levels.map((l) => l.id))
    const existingLevels = await this.db.lanternLevels.where('scaleId').equals(id).toArray()
    const removed = existingLevels.filter((l) => !keepIds.has(l.id))
    await Promise.all([
      ...removed.map((l) => this.db.lanternLevels.delete(l.id)),
      ...removed.map((l) => this.db.lanternImages.where('levelId').equals(l.id).delete()),
    ])

    return (await this.getLanternScale())!
  }

  async listLanternImages(levelId: string): Promise<ImageRef[]> {
    const images = await this.db.lanternImages.where('levelId').equals(levelId).toArray()
    return images
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((img) => ({ id: img.id, entryId: img.levelId, url: blobUrl(img.blob), createdAt: img.createdAt }))
  }

  async uploadLanternImage(file: File, levelId: string): Promise<ImageRef> {
    assertImageAllowed(file)
    const count = await this.db.lanternImages.where('levelId').equals(levelId).count()
    if (count >= MAX_IMAGES_PER_LEVEL) throw new Error(`Max ${MAX_IMAGES_PER_LEVEL} images per level`)
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    await this.db.lanternImages.put({ id, levelId, blob: file, createdAt })
    return { id, entryId: levelId, url: blobUrl(file), createdAt }
  }

  async deleteLanternImage(ref: ImageRef): Promise<void> {
    revokeBlobUrl(ref.url)
    await this.db.lanternImages.delete(ref.id)
  }

  async listLanternShares(): Promise<LanternShare[]> {
    return []
  }

  async createLanternShare(_label: string): Promise<LanternShare> {
    throw new Error('Sharing requires an account')
  }

  async revokeLanternShare(_id: string): Promise<void> {}

  /**
   * The current level works in guest mode too: naming where you are helps the
   * user regardless of who is watching, and the row migrates when they sign in.
   * One row only — re-setting reuses the id so nothing duplicates.
   */
  async getCurrentLevel(): Promise<LanternCurrentLevel | null> {
    const row = await this.db.lanternCurrentLevels.toCollection().first()
    return row ?? null
  }

  async setCurrentLevel(levelId: string): Promise<LanternCurrentLevel> {
    const existing = await this.db.lanternCurrentLevels.toCollection().first()
    const now = new Date()
    const row: LanternCurrentLevel = {
      id: existing?.id ?? crypto.randomUUID(),
      levelId,
      setAt: now.toISOString(),
      expiresAt: currentLevelExpiresAt(now),
    }
    await this.db.lanternCurrentLevels.put(row)
    return row
  }

  async clearCurrentLevel(): Promise<void> {
    await this.db.lanternCurrentLevels.clear()
  }

  /* Partnerships — remote-only; guest mode has no second account to share with. */

  async listPartnerships(): Promise<LanternPartnership[]> {
    return []
  }

  async findUserByUsername(_username: string): Promise<{ id: string; username: string } | null> {
    return null
  }

  async addPartner(_username: string): Promise<LanternPartnership> {
    throw new Error('Partners need an account')
  }

  async acceptPartnership(_id: string): Promise<void> {}

  async declinePartnership(_id: string): Promise<void> {}

  async revokePartnership(_id: string): Promise<void> {}

  async getPartnerStatus(): Promise<PartnerStatus[]> {
    return []
  }

  async exportAll(): Promise<ExportBundle> {
    const [
      profile, pins, jarDays, jarLogs, timelineEntries, timelineZones, images,
      breatheMeds, breatheCheckins, breatheDoseLogs, lanternImages, lanternScale,
    ] = await Promise.all([
      this.getProfile(),
      this.getPins(),
      this.db.jarDays.toArray(),
      this.db.jarLogs.toArray(),
      this.db.timelineEntries.toArray(),
      this.db.timelineZones.toArray(),
      this.db.images.toArray(),
      this.db.breatheMeds.toArray(),
      this.db.breatheCheckins.toArray(),
      this.db.breatheDoseLogs.toArray(),
      this.db.lanternImages.toArray(),
      this.getLanternScale(),
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
      breatheMeds,
      breatheCheckins,
      breatheDoseLogs,
      lanternScale,
      lanternImages: lanternImages.map((img) => ({
        id: img.id,
        levelId: img.levelId,
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
      this.db.breatheMeds.clear(),
      this.db.breatheCheckins.clear(),
      this.db.breatheDoseLogs.clear(),
      this.db.lanternScales.clear(),
      this.db.lanternLevels.clear(),
      this.db.lanternImages.clear(),
      this.db.lanternShares.clear(),
      this.db.lanternCurrentLevels.clear(),
    ])
  }
}