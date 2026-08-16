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

const BUCKET = 'steady-media'
const SIGNED_URL_TTL_SECONDS = 3600

interface ProfileRow {
  theme: string
  jar_default_spoons: number
  jar_reset_hour: number
  onboarding_done: boolean
  local_data_imported_at: string | null
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

function profileFromRow(r: ProfileRow): Profile {
  return {
    theme: r.theme as Profile['theme'],
    jarDefaultSpoons: Number(r.jar_default_spoons),
    jarResetHour: r.jar_reset_hour,
    onboardingDone: r.onboarding_done,
    localDataImportedAt: r.local_data_imported_at,
  }
}

function jarLogFromRow(r: JarLogRow): JarLog {
  return { id: r.id, date: r.date, spent: Number(r.spent), label: r.label, createdAt: r.created_at }
}

function timelineEntryFromRow(r: TimelineEntryRow): TimelineEntry {
  return {
    id: r.id,
    title: r.title,
    startDate: r.start_date,
    endDate: r.end_date,
    description: r.description,
    color: r.color,
    createdAt: r.created_at,
  }
}

function timelineZoneFromRow(r: TimelineZoneRow): TimelineZone {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    startDate: r.start_date,
    endDate: r.end_date,
    createdAt: r.created_at,
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
    }
    if (e.id) {
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
          createdAt: row.created_at,
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

  async exportAll(): Promise<ExportBundle> {
    const uid = await this.requireUserId()
    const [profile, pins, jarDays, jarLogs, entries, zones, images] = await Promise.all([
      this.getProfile(),
      this.getPins(),
      this.client.from('steady_jar_days').select('*').eq('user_id', uid),
      this.client.from('steady_jar_logs').select('*').eq('user_id', uid),
      this.client.from('steady_timeline_entries').select('*').eq('user_id', uid),
      this.client.from('steady_timeline_zones').select('*').eq('user_id', uid),
      this.client.from('steady_timeline_images').select('*').eq('user_id', uid),
    ])
    for (const r of [jarDays, jarLogs, entries, zones, images]) {
      if (r.error) throw r.error
    }
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
        createdAt: r.created_at,
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