/**
 * steady — ToolboxRepository (THE contract).
 *
 * Every feature reads and writes steady data through this interface. The two
 * implementations (Dexie for guests, Supabase for signed-in users) are
 * interchangeable and tested against the same behavioral suite.
 *
 * Contract extensions beyond the plan's §2.1 sketch:
 * - `listImages(entryId)` — blob:/signed URLs are transient, so features
 *   re-fetch image references on mount instead of persisting URLs.
 * - `saveTimelineEntry` / `saveZone` are upserts: an `id` in the input means
 *   update, absence means create (covers the edit flows in §6.4).
 */
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
} from './types'

export interface ToolboxRepository {
  getProfile(): Promise<Profile | null>
  setProfile(p: Profile): Promise<void>

  /** Ordered tool ids (pinned tools, first = top-left). */
  getPins(): Promise<string[]>
  setPins(ids: string[]): Promise<void>

  getJarDay(date: string): Promise<JarDay | null>
  upsertJarDay(d: JarDay): Promise<void>

  /** Full jar history, newest first. */
  listJarLogs(): Promise<JarLog[]>
  addJarLog(l: JarLogInput): Promise<JarLog>
  updateJarLog(id: string, l: JarLogInput): Promise<void>
  deleteJarLog(id: string): Promise<void>

  /** Timeline entries ordered by (startDate, createdAt). */
  listTimelineEntries(): Promise<TimelineEntry[]>
  saveTimelineEntry(e: TimelineEntryInput): Promise<TimelineEntry>
  deleteTimelineEntry(id: string): Promise<void>

  listZones(): Promise<TimelineZone[]>
  saveZone(z: TimelineZoneInput): Promise<TimelineZone>
  deleteZone(id: string): Promise<void>

  /** Images for one entry, newest first. */
  listImages(entryId: string): Promise<ImageRef[]>
  uploadImage(file: File, entryId: string): Promise<ImageRef>
  deleteImage(ref: ImageRef): Promise<void>

  /** Full JSON export (image blobs excluded — metadata only). */
  exportAll(): Promise<ExportBundle>

  /** Wipe the current mode's steady data (keeps the account itself). */
  deleteAllData(): Promise<void>
}