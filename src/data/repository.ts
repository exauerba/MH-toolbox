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
 *   insert-or-update (idempotent re-runs), absence means create (covers the edit flows in §6.4).
 */
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

  /* ---- Breathe ---------------------------------------------------- */
  listBreatheMeds(): Promise<BreatheMed[]>
  saveBreatheMed(m: BreatheMedInput, existingId?: string): Promise<BreatheMed>
  deleteBreatheMed(id: string): Promise<void>

  listBreatheCheckins(): Promise<BreatheCheckin[]>
  saveBreatheCheckin(c: BreatheCheckinInput, existingId?: string): Promise<BreatheCheckin>
  deleteBreatheCheckin(id: string): Promise<void>

  listBreatheDoseLogs(): Promise<BreatheDoseLog[]>
  /** Upsert: `existingId` updates an existing log, absence creates one. */
  addBreatheDoseLog(d: BreatheDoseLogInput, existingId?: string): Promise<BreatheDoseLog>
  deleteBreatheDoseLog(id: string): Promise<void>

  /* ---- Lantern ---------------------------------------------------- */
  /** The user's single scale, or null before first save. */
  getLanternScale(): Promise<LanternScale | null>
  /**
   * Upsert the scale and replace its levels: levels whose id is absent from
   * the input are deleted (whole-doc replace, idempotent re-runs).
   */
  saveLanternScale(s: LanternScaleInput): Promise<LanternScale>

  /** Images for one level, newest first. */
  listLanternImages(levelId: string): Promise<ImageRef[]>
  uploadLanternImage(file: File, levelId: string): Promise<ImageRef>
  deleteLanternImage(ref: ImageRef): Promise<void>

  /* Partner sharing — remote-only. Guest mode returns [] / throws. */
  listLanternShares(): Promise<LanternShare[]>
  createLanternShare(label: string): Promise<LanternShare>
  revokeLanternShare(id: string): Promise<void>

  /**
   * The user's current level, as their partners see it. Works in every mode
   * (guest value migrates with the account) because naming where you are
   * helps the user regardless of who is watching. One row per user;
   * `expiresAt` is set +60 min, and the UI treats an expired value as
   * "last updated" rather than as an active signal.
   */
  getCurrentLevel(): Promise<LanternCurrentLevel | null>
  /** Set (or re-set — the "still true?" refresh) the current level. */
  setCurrentLevel(levelId: string): Promise<LanternCurrentLevel>
  clearCurrentLevel(): Promise<void>

  /* Partnerships — remote-only (guest mode returns [] / throws / no-ops). */
  /** Outgoing and incoming partnerships for the signed-in user, newest first. */
  listPartnerships(): Promise<LanternPartnership[]>
  /** Look up someone by username. Null when no such account exists. */
  findUserByUsername(username: string): Promise<{ id: string; username: string } | null>
  /** Send a pending invitation. Throws 'Partners need an account' in guest mode. */
  addPartner(username: string): Promise<LanternPartnership>
  acceptPartnership(id: string): Promise<void>
  declinePartnership(id: string): Promise<void>
  /** Withdraw an invitation or disconnect an active partnership. */
  revokePartnership(id: string): Promise<void>
  /** Active partnerships where I am the partner — the read-only pane data. */
  getPartnerStatus(): Promise<PartnerStatus[]>
}