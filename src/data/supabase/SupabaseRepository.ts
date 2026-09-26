/**
 * Signed-in repository backed by Supabase. Requires an authenticated session
 * for every operation (the app only swaps to this repository when signed in).
 *
 * Row mapping: snake_case columns ↔ camelCase domain types. Image files live
 * in the private `steady-media` bucket at `{userId}/{entryId}/{uuid}{ext}`;
 * `listImages` returns fresh signed URLs (transient, ~1h).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

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

const BUCKET = 'steady-media'
const SIGNED_URL_TTL_SECONDS = 3600

interface ProfileRow {
  theme: string
  jar_default_spoons: number
  jar_reset_hour: number
  onboarding_done: boolean
  local_data_imported_at: string | null
  timeline_orientation: string | null
}

interface JarLogRow {
  id: string
  date: string
  spent: number
  label: string | null
  created_at: string
}

interface TimelineEntryRow {
  id: string
  title: string
  start_date: string
  end_date: string | null
  description: string
  color: string
  display_mode: string
  created_at: string
}

interface TimelineZoneRow {
  id: string
  name: string
  color: string
  start_date: string
  end_date: string | null
  created_at: string
}

interface TimelineImageRow {
  id: string
  entry_id: string
  storage_path: string
  created_at: string
}

interface BreatheMedRow {
  id: string
  user_id: string
  name: string
  med_type: string
  reminder_hour: number | null
  created_at: string
}

interface BreatheCheckinRow {
  id: string
  user_id: string
  date: string
  peak_flow: number | null
  symptoms: number | null
  sleep: number | null
  activity: number | null
  note: string | null
  created_at: string
}

interface BreatheDoseLogRow {
  id: string
  user_id: string
  med_id: string
  date: string
  time: string | null
  trigger: string[] | null
  created_at: string
}

interface LanternScaleRow {
  id: string
  user_id: string
  name: string
  level_count: number
  created_at: string
  updated_at: string
}

interface LanternLevelRow {
  id: string
  user_id: string
  scale_id: string
  position: number
  label: string
  description: string
  actions: string[] | null
  created_at: string
  updated_at: string
}

interface LanternImageRow {
  id: string
  user_id: string
  level_id: string
  storage_path: string
  created_at: string
}

interface LanternShareRow {
  id: string
  user_id: string
  scale_id: string
  token: string
  label: string
  created_at: string
  revoked_at: string | null
}

/** Canonicalize Postgres timestamptz output (`...+00:00`) to ISO `.000Z`. */
function iso(v: string | null): string | null {
  return v ? new Date(v).toISOString() : null
}

function profileFromRow(r: ProfileRow): Profile {
  return {
    theme: r.theme as Profile['theme'],
    jarDefaultSpoons: Number(r.jar_default_spoons),
    jarResetHour: r.jar_reset_hour,
    onboardingDone: r.onboarding_done,
    localDataImportedAt: iso(r.local_data_imported_at),
    timelineOrientation:
      r.timeline_orientation === 'horizontal' || r.timeline_orientation === 'vertical'
        ? r.timeline_orientation
        : undefined,
  }
}

function jarLogFromRow(r: JarLogRow): JarLog {
  return { id: r.id, date: r.date, spent: Number(r.spent), label: r.label, createdAt: iso(r.created_at) ?? '' }
}

function timelineEntryFromRow(r: TimelineEntryRow): TimelineEntry {
  return {
    id: r.id,
    title: r.title,
    startDate: r.start_date,
    endDate: r.end_date,
    description: r.description,
    color: r.color,
    displayMode: r.display_mode === 'compact' ? 'compact' : 'card',
    createdAt: iso(r.created_at) ?? '',
  }
}

function timelineZoneFromRow(r: TimelineZoneRow): TimelineZone {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    startDate: r.start_date,
    endDate: r.end_date,
    createdAt: iso(r.created_at) ?? '',
  }
}

function extensionFor(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    default:
      return ''
  }
}

function breatheMedFromRow(r: BreatheMedRow): BreatheMed {
  return {
    id: r.id,
    name: r.name,
    medType: (r.med_type as BreatheMed['medType']) ?? 'controller',
    reminderHour: r.reminder_hour,
    createdAt: iso(r.created_at) ?? '',
  }
}

function breatheMedToRow(m: BreatheMedInput, userId: string, existingId?: string) {
  const row: Record<string, unknown> = {
    user_id: userId,
    name: m.name,
    med_type: m.medType ?? 'controller',
    reminder_hour: m.reminderHour ?? null,
  }
  if (existingId) row.id = existingId
  return row
}

function breatheCheckinFromRow(r: BreatheCheckinRow): BreatheCheckin {
  return {
    id: r.id,
    date: r.date,
    peakFlow: r.peak_flow,
    symptoms: r.symptoms,
    sleep: r.sleep,
    activity: r.activity,
    note: r.note,
    createdAt: iso(r.created_at) ?? '',
  }
}

function breatheCheckinToRow(c: BreatheCheckinInput, userId: string, existingId?: string) {
  const row: Record<string, unknown> = {
    user_id: userId,
    date: c.date,
    peak_flow: c.peakFlow ?? null,
    symptoms: c.symptoms ?? null,
    sleep: c.sleep ?? null,
    activity: c.activity ?? null,
    note: c.note ?? null,
  }
  if (existingId) row.id = existingId
  return row
}

function breatheDoseLogFromRow(r: BreatheDoseLogRow): BreatheDoseLog {
  return {
    id: r.id,
    medId: r.med_id,
    date: r.date,
    time: r.time,
    trigger: r.trigger ?? [],
    createdAt: iso(r.created_at) ?? '',
  }
}

function breatheDoseLogToRow(d: BreatheDoseLogInput, userId: string, existingId?: string) {
  const row: Record<string, unknown> = {
    user_id: userId,
    med_id: d.medId,
    date: d.date,
    time: d.time ?? null,
    trigger: d.trigger ?? [],
  }
  if (existingId) row.id = existingId
  return row
}

function lanternScaleFromRow(r: LanternScaleRow): LanternScale {
  return {
    id: r.id,
    name: r.name,
    levelCount: r.level_count,
    levels: [],
    createdAt: iso(r.created_at) ?? '',
    updatedAt: iso(r.updated_at) ?? '',
  }
}

function lanternLevelFromRow(r: LanternLevelRow): LanternLevel {
  return {
    id: r.id,
    position: r.position,
    label: r.label,
    description: r.description,
    actions: r.actions ?? [],
  }
}

function lanternShareFromRow(r: LanternShareRow): LanternShare {
  return {
    id: r.id,
    label: r.label,
    token: r.token,
    createdAt: iso(r.created_at) ?? '',
    revokedAt: iso(r.revoked_at),
  }
}

export class SupabaseRepository implements ToolboxRepository {
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getSession()
    if (error || !data.session) throw new Error('Not signed in')
    return data.session.user.id
  }

  async getProfile(): Promise<Profile | null> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_profiles')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (error) throw error
    return data ? profileFromRow(data) : null
  }

  async setProfile(p: Profile): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client.from('steady_profiles').upsert(
      {
        user_id: uid,
        theme: p.theme,
        jar_default_spoons: p.jarDefaultSpoons,
        jar_reset_hour: p.jarResetHour,
        onboarding_done: p.onboardingDone,
        local_data_imported_at: p.localDataImportedAt,
        timeline_orientation: p.timelineOrientation ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    if (error) throw error
  }

  async getPins(): Promise<string[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_pins')
      .select('tool_id')
      .eq('user_id', uid)
      .order('position', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => r.tool_id)
  }

  async setPins(ids: string[]): Promise<void> {
    const uid = await this.requireUserId()
    const { error: delErr } = await this.client.from('steady_pins').delete().eq('user_id', uid)
    if (delErr) throw delErr
    if (ids.length === 0) return
    const { error } = await this.client
      .from('steady_pins')
      .insert(ids.map((toolId, i) => ({ user_id: uid, tool_id: toolId, position: i })))
    if (error) throw error
  }

  async getJarDay(date: string): Promise<JarDay | null> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_jar_days')
      .select('*')
      .eq('user_id', uid)
      .eq('date', date)
      .maybeSingle()
    if (error) throw error
    return data ? { date: data.date, totalSpoons: Number(data.total_spoons) } : null
  }

  async upsertJarDay(d: JarDay): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client
      .from('steady_jar_days')
      .upsert({ user_id: uid, date: d.date, total_spoons: d.totalSpoons }, { onConflict: 'user_id,date' })
    if (error) throw error
  }

  async listJarLogs(): Promise<JarLog[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_jar_logs')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(jarLogFromRow)
  }

  async addJarLog(l: JarLogInput): Promise<JarLog> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_jar_logs')
      .insert({ user_id: uid, date: l.date, spent: l.spent, label: l.label ?? null })
      .select()
      .single()
    if (error) throw error
    return jarLogFromRow(data)
  }

  async updateJarLog(id: string, l: JarLogInput): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client
      .from('steady_jar_logs')
      .update({ date: l.date, spent: l.spent, label: l.label ?? null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', uid)
    if (error) throw error
  }

  async deleteJarLog(id: string): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client.from('steady_jar_logs').delete().eq('id', id).eq('user_id', uid)
    if (error) throw error
  }

  async listTimelineEntries(): Promise<TimelineEntry[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_timeline_entries')
      .select('*')
      .eq('user_id', uid)
      .order('start_date', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(timelineEntryFromRow)
  }

  async saveTimelineEntry(e: TimelineEntryInput): Promise<TimelineEntry> {
    const uid = await this.requireUserId()
    const row = {
      title: e.title,
      start_date: e.startDate,
      end_date: e.endDate ?? null,
      description: e.description ?? '',
      color: e.color,
      display_mode: e.displayMode ?? 'card',
    }
    if (e.id) {
      const { data: existing } = await this.client
        .from('steady_timeline_entries')
        .select('id')
        .eq('id', e.id)
        .eq('user_id', uid)
        .maybeSingle()
      if (existing) {
        const { data, error } = await this.client
          .from('steady_timeline_entries')
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', e.id)
          .eq('user_id', uid)
          .select()
          .single()
        if (error) throw error
        return timelineEntryFromRow(data)
      }
      const { data, error } = await this.client
        .from('steady_timeline_entries')
        .insert({ id: e.id, user_id: uid, ...row })
        .select()
        .single()
      if (error) throw error
      return timelineEntryFromRow(data)
    }
    const { data, error } = await this.client
      .from('steady_timeline_entries')
      .insert({ user_id: uid, ...row })
      .select()
      .single()
    if (error) throw error
    return timelineEntryFromRow(data)
  }

  async deleteTimelineEntry(id: string): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client
      .from('steady_timeline_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', uid)
    if (error) throw error
  }

  async listZones(): Promise<TimelineZone[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_timeline_zones')
      .select('*')
      .eq('user_id', uid)
      .order('start_date', { ascending: true })
    if (error) throw error
    return (data ?? []).map(timelineZoneFromRow)
  }

  async saveZone(z: TimelineZoneInput): Promise<TimelineZone> {
    const uid = await this.requireUserId()
    const row = {
      name: z.name,
      color: z.color,
      start_date: z.startDate,
      end_date: z.endDate ?? null,
    }
    if (z.id) {
      const { data: existing } = await this.client
        .from('steady_timeline_zones')
        .select('id')
        .eq('id', z.id)
        .eq('user_id', uid)
        .maybeSingle()
      if (existing) {
        const { data, error } = await this.client
          .from('steady_timeline_zones')
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', z.id)
          .eq('user_id', uid)
          .select()
          .single()
        if (error) throw error
        return timelineZoneFromRow(data)
      }
      const { data, error } = await this.client
        .from('steady_timeline_zones')
        .insert({ id: z.id, user_id: uid, ...row })
        .select()
        .single()
      if (error) throw error
      return timelineZoneFromRow(data)
    }
    const { data, error } = await this.client
      .from('steady_timeline_zones')
      .insert({ user_id: uid, ...row })
      .select()
      .single()
    if (error) throw error
    return timelineZoneFromRow(data)
  }

  async deleteZone(id: string): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client.from('steady_timeline_zones').delete().eq('id', id).eq('user_id', uid)
    if (error) throw error
  }

  async listImages(entryId: string): Promise<ImageRef[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_timeline_images')
      .select('*')
      .eq('user_id', uid)
      .eq('entry_id', entryId)
      .order('created_at', { ascending: false })
    if (error) throw error
    const refs: ImageRef[] = []
    for (const row of data ?? []) {
      const { data: signed } = await this.client.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS)
      if (signed) {
        refs.push({
          id: row.id,
          entryId: row.entry_id,
          url: signed.signedUrl,
          storagePath: row.storage_path,
          createdAt: iso(row.created_at) ?? '',
        })
      }
    }
    return refs
  }

  async uploadImage(file: File, entryId: string): Promise<ImageRef> {
    assertImageAllowed(file)
    const uid = await this.requireUserId()
    const { count, error: countErr } = await this.client
      .from('steady_timeline_images')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('entry_id', entryId)
    if (countErr) throw countErr
    if ((count ?? 0) >= MAX_IMAGES_PER_ENTRY) throw new Error(`Max ${MAX_IMAGES_PER_ENTRY} images per entry`)

    const id = crypto.randomUUID()
    const path = `${uid}/${entryId}/${id}${extensionFor(file.type)}`
    const { error: upErr } = await this.client.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
    })
    if (upErr) throw upErr
    const { error: insErr } = await this.client
      .from('steady_timeline_images')
      .insert({ id, user_id: uid, entry_id: entryId, storage_path: path })
    if (insErr) throw insErr

    const { data: signed } = await this.client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    return {
      id,
      entryId,
      url: signed?.signedUrl ?? '',
      storagePath: path,
      createdAt: new Date().toISOString(),
    }
  }

  async deleteImage(ref: ImageRef): Promise<void> {
    const uid = await this.requireUserId()
    if (ref.storagePath) {
      const { error } = await this.client.storage.from(BUCKET).remove([ref.storagePath])
      if (error) throw error
    }
    const { error } = await this.client
      .from('steady_timeline_images')
      .delete()
      .eq('id', ref.id)
      .eq('user_id', uid)
    if (error) throw error
  }

  /* ---- Breathe ---------------------------------------------------- */

  async listBreatheMeds(): Promise<BreatheMed[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_breathe_meds')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(breatheMedFromRow)
  }

  async saveBreatheMed(m: BreatheMedInput, existingId?: string): Promise<BreatheMed> {
    const uid = await this.requireUserId()
    if (existingId) {
      const { data: existing } = await this.client
        .from('steady_breathe_meds')
        .select('id')
        .eq('id', existingId)
        .eq('user_id', uid)
        .maybeSingle()
      if (existing) {
        const row = breatheMedToRow(m, uid)
        delete row.user_id
        const { data, error } = await this.client
          .from('steady_breathe_meds')
          .update(row)
          .eq('id', existingId)
          .eq('user_id', uid)
          .select()
          .single()
        if (error) throw error
        return breatheMedFromRow(data)
      }
      const { data, error } = await this.client
        .from('steady_breathe_meds')
        .insert(breatheMedToRow(m, uid, existingId))
        .select()
        .single()
      if (error) throw error
      return breatheMedFromRow(data)
    }
    const { data, error } = await this.client
      .from('steady_breathe_meds')
      .insert(breatheMedToRow(m, uid))
      .select()
      .single()
    if (error) throw error
    return breatheMedFromRow(data)
  }

  async deleteBreatheMed(id: string): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client.from('steady_breathe_meds').delete().eq('id', id).eq('user_id', uid)
    if (error) throw error
  }

  async listBreatheCheckins(): Promise<BreatheCheckin[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_breathe_checkins')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(breatheCheckinFromRow)
  }

  async saveBreatheCheckin(c: BreatheCheckinInput, existingId?: string): Promise<BreatheCheckin> {
    const uid = await this.requireUserId()
    if (existingId) {
      const { data: existing } = await this.client
        .from('steady_breathe_checkins')
        .select('id')
        .eq('id', existingId)
        .eq('user_id', uid)
        .maybeSingle()
      if (existing) {
        const row = breatheCheckinToRow(c, uid)
        delete row.user_id
        const { data, error } = await this.client
          .from('steady_breathe_checkins')
          .update(row)
          .eq('id', existingId)
          .eq('user_id', uid)
          .select()
          .single()
        if (error) throw error
        return breatheCheckinFromRow(data)
      }
      const { data, error } = await this.client
        .from('steady_breathe_checkins')
        .insert(breatheCheckinToRow(c, uid, existingId))
        .select()
        .single()
      if (error) throw error
      return breatheCheckinFromRow(data)
    }
    const { data, error } = await this.client
      .from('steady_breathe_checkins')
      .insert(breatheCheckinToRow(c, uid))
      .select()
      .single()
    if (error) throw error
    return breatheCheckinFromRow(data)
  }

  async deleteBreatheCheckin(id: string): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client.from('steady_breathe_checkins').delete().eq('id', id).eq('user_id', uid)
    if (error) throw error
  }

  async listBreatheDoseLogs(): Promise<BreatheDoseLog[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_breathe_dose_logs')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(breatheDoseLogFromRow)
  }

  async addBreatheDoseLog(d: BreatheDoseLogInput, existingId?: string): Promise<BreatheDoseLog> {
    const uid = await this.requireUserId()
    if (existingId) {
      const { data: existing } = await this.client
        .from('steady_breathe_dose_logs')
        .select('id')
        .eq('id', existingId)
        .eq('user_id', uid)
        .maybeSingle()
      if (existing) {
        const row = breatheDoseLogToRow(d, uid)
        delete row.user_id
        const { data, error } = await this.client
          .from('steady_breathe_dose_logs')
          .update(row)
          .eq('id', existingId)
          .eq('user_id', uid)
          .select()
          .single()
        if (error) throw error
        return breatheDoseLogFromRow(data)
      }
      const { data, error } = await this.client
        .from('steady_breathe_dose_logs')
        .insert(breatheDoseLogToRow(d, uid, existingId))
        .select()
        .single()
      if (error) throw error
      return breatheDoseLogFromRow(data)
    }
    const { data, error } = await this.client
      .from('steady_breathe_dose_logs')
      .insert(breatheDoseLogToRow(d, uid))
      .select()
      .single()
    if (error) throw error
    return breatheDoseLogFromRow(data)
  }

  async deleteBreatheDoseLog(id: string): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client.from('steady_breathe_dose_logs').delete().eq('id', id).eq('user_id', uid)
    if (error) throw error
  }

  /* ---- Lantern ---------------------------------------------------- */

  async getLanternScale(): Promise<LanternScale | null> {
    const uid = await this.requireUserId()
    const { data: scale, error } = await this.client
      .from('steady_lantern_scales')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (error) throw error
    if (!scale) return null
    const { data: levels, error: levelErr } = await this.client
      .from('steady_lantern_levels')
      .select('*')
      .eq('scale_id', scale.id)
      .order('position', { ascending: true })
    if (levelErr) throw levelErr
    return { ...lanternScaleFromRow(scale), levels: (levels ?? []).map(lanternLevelFromRow) }
  }

  async saveLanternScale(s: LanternScaleInput): Promise<LanternScale> {
    const uid = await this.requireUserId()
    let scaleId = s.id
    if (scaleId) {
      const { data: existing } = await this.client
        .from('steady_lantern_scales')
        .select('id')
        .eq('id', scaleId)
        .eq('user_id', uid)
        .maybeSingle()
      if (existing) {
        const { error } = await this.client
          .from('steady_lantern_scales')
          .update({ name: s.name, level_count: s.levelCount, updated_at: new Date().toISOString() })
          .eq('id', scaleId)
          .eq('user_id', uid)
        if (error) throw error
      } else {
        const { error } = await this.client
          .from('steady_lantern_scales')
          .insert({ id: scaleId, user_id: uid, name: s.name, level_count: s.levelCount })
        if (error) throw error
      }
    } else {
      const { data, error } = await this.client
        .from('steady_lantern_scales')
        .insert({ user_id: uid, name: s.name, level_count: s.levelCount })
        .select()
        .single()
      if (error) throw error
      scaleId = data.id
    }
    if (!scaleId) throw new Error('Missing scale id')

    for (const level of s.levels) {
      await this.upsertLanternLevel(uid, scaleId, level)
    }

    const keepIds = new Set(s.levels.map((l) => l.id))
    const { data: existingLevels, error: listErr } = await this.client
      .from('steady_lantern_levels')
      .select('id')
      .eq('scale_id', scaleId)
      .eq('user_id', uid)
    if (listErr) throw listErr
    const stale = (existingLevels ?? []).filter((r) => !keepIds.has(r.id)).map((r) => r.id)
    if (stale.length > 0) {
      const { error } = await this.client.from('steady_lantern_levels').delete().in('id', stale).eq('user_id', uid)
      if (error) throw error
    }

    const { data: scale, error: scaleErr } = await this.client
      .from('steady_lantern_scales')
      .select('*')
      .eq('id', scaleId)
      .eq('user_id', uid)
      .maybeSingle()
    if (scaleErr) throw scaleErr
    if (!scale) throw new Error('Scale not found')
    const { data: levels, error: levelErr } = await this.client
      .from('steady_lantern_levels')
      .select('*')
      .eq('scale_id', scale.id)
      .order('position', { ascending: true })
    if (levelErr) throw levelErr
    return { ...lanternScaleFromRow(scale), levels: (levels ?? []).map(lanternLevelFromRow) }
  }

  private async upsertLanternLevel(uid: string, scaleId: string, level: LanternLevel): Promise<void> {
    const { data: existing } = await this.client
      .from('steady_lantern_levels')
      .select('id')
      .eq('id', level.id)
      .eq('user_id', uid)
      .maybeSingle()
    if (existing) {
      const { error } = await this.client
        .from('steady_lantern_levels')
        .update({
          position: level.position,
          label: level.label,
          description: level.description,
          actions: level.actions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', level.id)
        .eq('user_id', uid)
      if (error) throw error
    } else {
      const { error } = await this.client
        .from('steady_lantern_levels')
        .insert({
          id: level.id,
          user_id: uid,
          scale_id: scaleId,
          position: level.position,
          label: level.label,
          description: level.description,
          actions: level.actions,
        })
      if (error) throw error
    }
  }

  async listLanternImages(levelId: string): Promise<ImageRef[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_lantern_images')
      .select('*')
      .eq('user_id', uid)
      .eq('level_id', levelId)
      .order('created_at', { ascending: false })
    if (error) throw error
    const refs: ImageRef[] = []
    for (const row of data ?? []) {
      const { data: signed } = await this.client.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS)
      if (signed) {
        refs.push({
          id: row.id,
          entryId: row.level_id,
          url: signed.signedUrl,
          storagePath: row.storage_path,
          createdAt: iso(row.created_at) ?? '',
        })
      }
    }
    return refs
  }

  async uploadLanternImage(file: File, levelId: string): Promise<ImageRef> {
    assertImageAllowed(file)
    const uid = await this.requireUserId()
    const { count, error: countErr } = await this.client
      .from('steady_lantern_images')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('level_id', levelId)
    if (countErr) throw countErr
    if ((count ?? 0) >= MAX_IMAGES_PER_LEVEL) throw new Error(`Max ${MAX_IMAGES_PER_LEVEL} images per level`)

    const id = crypto.randomUUID()
    const path = `${uid}/${levelId}/${id}${extensionFor(file.type)}`
    const { error: upErr } = await this.client.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
    })
    if (upErr) throw upErr
    const { error: insErr } = await this.client
      .from('steady_lantern_images')
      .insert({ id, user_id: uid, level_id: levelId, storage_path: path })
    if (insErr) throw insErr

    const { data: signed } = await this.client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    return {
      id,
      entryId: levelId,
      url: signed?.signedUrl ?? '',
      storagePath: path,
      createdAt: new Date().toISOString(),
    }
  }

  async deleteLanternImage(ref: ImageRef): Promise<void> {
    const uid = await this.requireUserId()
    if (ref.storagePath) {
      const { error } = await this.client.storage.from(BUCKET).remove([ref.storagePath])
      if (error) throw error
    }
    const { error } = await this.client
      .from('steady_lantern_images')
      .delete()
      .eq('id', ref.id)
      .eq('user_id', uid)
    if (error) throw error
  }

  async listLanternShares(): Promise<LanternShare[]> {
    const uid = await this.requireUserId()
    const { data, error } = await this.client
      .from('steady_lantern_shares')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(lanternShareFromRow)
  }

  async createLanternShare(label: string): Promise<LanternShare> {
    const uid = await this.requireUserId()
    const { data: scale } = await this.client
      .from('steady_lantern_scales')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle()
    if (!scale) throw new Error('Create your scale before sharing it')
    const { data, error } = await this.client
      .from('steady_lantern_shares')
      .insert({ user_id: uid, scale_id: scale.id, label })
      .select()
      .single()
    if (error) throw error
    return lanternShareFromRow(data)
  }

  async revokeLanternShare(id: string): Promise<void> {
    const uid = await this.requireUserId()
    const { error } = await this.client
      .from('steady_lantern_shares')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', uid)
    if (error) throw error
  }

  async exportAll(): Promise<ExportBundle> {
    const uid = await this.requireUserId()
    const [profile, pins, jarDays, jarLogs, entries, zones, images, meds, checkins, doseLogs, scale, levels, lImages, shares] = await Promise.all([
      this.getProfile(),
      this.getPins(),
      this.client.from('steady_jar_days').select('*').eq('user_id', uid),
      this.client.from('steady_jar_logs').select('*').eq('user_id', uid),
      this.client.from('steady_timeline_entries').select('*').eq('user_id', uid),
      this.client.from('steady_timeline_zones').select('*').eq('user_id', uid),
      this.client.from('steady_timeline_images').select('*').eq('user_id', uid),
      this.client.from('steady_breathe_meds').select('*').eq('user_id', uid),
      this.client.from('steady_breathe_checkins').select('*').eq('user_id', uid),
      this.client.from('steady_breathe_dose_logs').select('*').eq('user_id', uid),
      this.client.from('steady_lantern_scales').select('*').eq('user_id', uid).maybeSingle(),
      this.client.from('steady_lantern_levels').select('*').eq('user_id', uid),
      this.client.from('steady_lantern_images').select('*').eq('user_id', uid),
      this.client.from('steady_lantern_shares').select('*').eq('user_id', uid),
    ])
    for (const r of [jarDays, jarLogs, entries, zones, images, meds, checkins, doseLogs, scale, levels, lImages, shares]) {
      if (r.error) throw r.error
    }
    const lanternScale = scale?.data
      ? {
          ...lanternScaleFromRow(scale.data),
          levels: (levels?.data ?? [])
            .filter((r: LanternLevelRow) => r.scale_id === scale.data.id)
            .sort((a: LanternLevelRow, b: LanternLevelRow) => a.position - b.position)
            .map(lanternLevelFromRow),
        }
      : null
    return {
      exportedAt: new Date().toISOString(),
      profile,
      pins,
      jarDays: (jarDays.data ?? []).map((r) => ({ date: r.date, totalSpoons: Number(r.total_spoons) })),
      jarLogs: (jarLogs.data ?? []).map(jarLogFromRow),
      timelineEntries: (entries.data ?? []).map(timelineEntryFromRow),
      timelineZones: (zones.data ?? []).map(timelineZoneFromRow),
      timelineImages: (images.data ?? []).map((r: TimelineImageRow) => ({
        id: r.id,
        entryId: r.entry_id,
        storagePath: r.storage_path,
        createdAt: iso(r.created_at) ?? '',
      })),
      breatheMeds: (meds.data ?? []).map(breatheMedFromRow),
      breatheCheckins: (checkins.data ?? []).map(breatheCheckinFromRow),
      breatheDoseLogs: (doseLogs.data ?? []).map(breatheDoseLogFromRow),
      lanternScale,
      lanternImages: (lImages?.data ?? []).map((r: LanternImageRow) => ({
        id: r.id,
        levelId: r.level_id,
        storagePath: r.storage_path,
        createdAt: iso(r.created_at) ?? '',
      })),
    }
  }

  async deleteAllData(): Promise<void> {
    const uid = await this.requireUserId()
    const tables = [
      'steady_profiles',
      'steady_pins',
      'steady_jar_days',
      'steady_jar_logs',
      'steady_timeline_entries',
      'steady_timeline_zones',
      'steady_timeline_images',
      'steady_breathe_meds',
      'steady_breathe_checkins',
      'steady_breathe_dose_logs',
      'steady_lantern_scales',
      'steady_lantern_levels',
      'steady_lantern_images',
      'steady_lantern_shares',
    ]
    for (const t of tables) {
      const { error } = await this.client.from(t).delete().eq('user_id', uid)
      if (error) throw error
    }
    await this.deleteUserStorage(uid)
  }

  private async deleteUserStorage(uid: string): Promise<void> {
    const storage = this.client.storage.from(BUCKET)
    const { data: dirs, error } = await storage.list(uid)
    if (error) throw error
    const paths: string[] = []
    for (const dir of dirs ?? []) {
      const { data: files } = await storage.list(`${uid}/${dir.name}`)
      for (const f of files ?? []) paths.push(`${uid}/${dir.name}/${f.name}`)
    }
    if (paths.length > 0) {
      const { error: rmErr } = await storage.remove(paths)
      if (rmErr) throw rmErr
    }
  }
}