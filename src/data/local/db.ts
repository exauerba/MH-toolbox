/**
 * Guest-mode persistence: a Dexie (IndexedDB) mirror of the steady domain.
 * Stores use the same domain types as the Supabase tables, so the two
 * repositories stay behaviorally identical (see tests/parity.suite.ts).
 */
import Dexie, { type EntityTable } from 'dexie'

import type { JarDay, JarLog, Profile, TimelineEntry, TimelineZone } from '../types'

/** Single-row wrapper for the profile store (one guest profile). */
export interface ProfileRow {
  key: 'profile'
  value: Profile
}

/** Single-row wrapper for the pins store (one ordered list). */
export interface PinRow {
  key: 'pins'
  value: string[]
}

/** Image row: metadata plus the raw blob (blob: URLs are recreated on read). */
export interface LocalImage {
  id: string
  entryId: string
  blob: Blob
  createdAt: string
}

export interface SteadyDB extends Dexie {
  profiles: EntityTable<ProfileRow, 'key'>
  pins: EntityTable<PinRow, 'key'>
  jarDays: EntityTable<JarDay, 'date'>
  jarLogs: EntityTable<JarLog, 'id'>
  timelineEntries: EntityTable<TimelineEntry, 'id'>
  timelineZones: EntityTable<TimelineZone, 'id'>
  images: EntityTable<LocalImage, 'id'>
}

export function createSteadyDB(name = 'steady'): SteadyDB {
  const db = new Dexie(name) as SteadyDB
  db.version(1).stores({
    profiles: 'key',
    pins: 'key',
    jarDays: 'date',
    jarLogs: 'id',
    timelineEntries: 'id',
    timelineZones: 'id',
    images: 'id, entryId',
  })
  return db
}