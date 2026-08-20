/**
 * steady — domain types (THE contract).
 *
 * Every feature reads and writes these types through `ToolboxRepository`.
 * Storage details (snake_case columns, Dexie stores) live inside the
 * implementations and never leak out. Changes here are the highest-impact
 * changes in the codebase — review them as such (see EXECUTION_STRATEGY §3).
 */

/** Theme preference, mirroring the design system's three modes. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** Preferred timeline layout. Persisted per-user; defaults to device-based. */
export type TimelineOrientation = 'vertical' | 'horizontal'

export interface Profile {
  theme: ThemePreference
  /** Default daily jar capacity (spoons). */
  jarDefaultSpoons: number
  /** Hour (0–23, local) at which a new jar day starts. */
  jarResetHour: number
  onboardingDone: boolean
  /** When local (guest) data was imported into this account; null before. */
  localDataImportedAt: string | null
  /** Preferred timeline orientation; absent = follow device (vertical on mobile). */
  timelineOrientation?: TimelineOrientation
}

/** A day's jar capacity. Keyed by local calendar date (YYYY-MM-DD). */
export interface JarDay {
  date: string
  totalSpoons: number
}

export interface JarLog {
  id: string
  /** Day-window attribution, computed at write time (YYYY-MM-DD). */
  date: string
  /** Spoons spent, in 0.5 steps. */
  spent: number
  /** Optional free-text label, ≤ 40 chars. */
  label: string | null
  createdAt: string
}

export interface JarLogInput {
  date: string
  spent: number
  label?: string | null
}

/** How an entry renders on the horizontal timeline. */
export type TimelineDisplayMode = 'card' | 'compact'

export interface TimelineEntry {
  id: string
  title: string
  startDate: string
  endDate: string | null
  description: string
  color: string
  /** 'card' = full card on the track; 'compact' = marker that opens details. */
  displayMode: TimelineDisplayMode
  createdAt: string
}

/** `id` present = update an existing entry; absent = create. */
export interface TimelineEntryInput {
  id?: string
  title: string
  startDate: string
  endDate?: string | null
  description?: string
  color: string
  /** Defaults to 'card' when omitted. */
  displayMode?: TimelineDisplayMode
}

export interface TimelineZone {
  id: string
  name: string
  color: string
  startDate: string
  /** Null = ongoing. */
  endDate: string | null
  createdAt: string
}

/** `id` present = update an existing zone; absent = create. */
export interface TimelineZoneInput {
  id?: string
  name: string
  color: string
  startDate: string
  endDate?: string | null
}

/** Image metadata row (child of a timeline entry). */
export interface TimelineImage {
  id: string
  entryId: string
  /** Storage path on Supabase; blob key in guest mode. */
  storagePath: string
  createdAt: string
}

/**
 * A displayable image reference. `url` is a blob: URL in guest mode and a
 * signed URL on Supabase — both are transient, so features re-fetch via
 * `listImages` on mount rather than persisting URLs.
 */
export interface ImageRef {
  id: string
  entryId: string
  url: string
  /** Storage path on Supabase; absent in guest mode. */
  storagePath?: string
  createdAt: string
}

/**
 * Full JSON export. Image blobs are intentionally excluded (metadata only) —
 * the export is a data backup; images are restored via the migration path.
 */
export interface ExportBundle {
  exportedAt: string
  profile: Profile | null
  pins: string[]
  jarDays: JarDay[]
  jarLogs: JarLog[]
  timelineEntries: TimelineEntry[]
  timelineZones: TimelineZone[]
  timelineImages: TimelineImage[]
}