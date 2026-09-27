/**
 * Guest-mode persistence: a Dexie (IndexedDB) mirror of the steady domain.
 * Stores use the same domain types as the Supabase tables, so the two
 * repositories stay behaviorally identical (see tests/parity.suite.ts).
 */
import Dexie, { type EntityTable } from 'dexie'

import type { BreatheCheckin, BreatheDoseLog, BreatheMed, JarDay, JarLog, LanternCurrentLevel, LanternLevel, LanternScale, LanternShare, Profile, TimelineEntry, TimelineZone } from '../types'

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

/** Lantern image row: metadata plus the raw blob (mirror of LocalImage). */
export interface LocalLanternImage {
  id: string
  levelId: string
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
  breatheMeds: EntityTable<BreatheMed, 'id'>
  breatheCheckins: EntityTable<BreatheCheckin, 'id'>
  breatheDoseLogs: EntityTable<BreatheDoseLog, 'id'>
  lanternScales: EntityTable<LanternScale, 'id'>
  lanternLevels: EntityTable<LanternLevel & { scaleId: string }, 'id'>
  lanternImages: EntityTable<LocalLanternImage, 'id'>
  lanternShares: EntityTable<LanternShare, 'id'>
  /** One row: the current level, time-boxed via `expiresAt`. */
  lanternCurrentLevels: EntityTable<LanternCurrentLevel, 'id'>
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
  db.version(2).stores({
    profiles: 'key',
    pins: 'key',
    jarDays: 'date',
    jarLogs: 'id',
    timelineEntries: 'id',
    timelineZones: 'id',
    images: 'id, entryId',
    breatheMeds: 'id',
    breatheCheckins: 'id, date',
    breatheDoseLogs: 'id, date, medId',
  })
  db.version(3).stores({
    profiles: 'key',
    pins: 'key',
    jarDays: 'date',
    jarLogs: 'id',
    timelineEntries: 'id',
    timelineZones: 'id',
    images: 'id, entryId',
    breatheMeds: 'id',
    breatheCheckins: 'id, date',
    breatheDoseLogs: 'id, date, medId',
    lanternScales: 'id',
    lanternLevels: 'id, scaleId',
    lanternImages: 'id, levelId',
    lanternShares: 'id',
  })
  db.version(4).stores({
    profiles: 'key',
    pins: 'key',
    jarDays: 'date',
    jarLogs: 'id',
    timelineEntries: 'id',
    timelineZones: 'id',
    images: 'id, entryId',
    breatheMeds: 'id',
    breatheCheckins: 'id, date',
    breatheDoseLogs: 'id, date, medId',
    lanternScales: 'id',
    lanternLevels: 'id, scaleId',
    lanternImages: 'id, levelId',
    lanternShares: 'id',
    lanternCurrentLevels: 'id',
  })
  return db
}