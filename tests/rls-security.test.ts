/**
 * RLS security tests (CI-gated).
 *
 * Runs against the shared hosted Supabase project (xxtavjeetzvtlhwoenho) —
 * the same backend bloom uses. The suite SELF-SKIPS unless SUPABASE_URL,
 * SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are all set (CI provides
 * them via repo secrets). The service role key is used only to create and
 * delete throwaway test users; all assertions run as normal users or anon.
 *
 * Asserts, for EVERY steady_* table:
 *   (a) unauthenticated select returns nothing,
 *   (b) user A can insert + select their own row,
 *   (c) user A CANNOT select / update / delete user B's row,
 *   (d) anonymous insert is blocked by RLS.
 *
 * The one exception to (c) is steady_lantern_partnerships, which is two-party
 * (sharer_id AND partner_id) rather than single-owner, so it is asserted
 * longhand at the bottom of this file instead of through the shared harness.
 *
 * The SECURITY DEFINER RPCs added by migration 010 (find_user_by_username,
 * get_partner_status) are NOT called from here: this harness signs in with the
 * anon key plus a password, which is not the JWT shape PostgREST needs for a
 * definer call, and the flows behind them are covered by tests/parity.suite.ts.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const envUrl = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const envAnonKey = process.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
const envServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const canRun = !!envUrl && !!envAnonKey && !!envServiceKey

if (!canRun) {
  console.warn('RLS tests skipped: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY not all set')
}

const suite = canRun ? describe : describe.skip

function uuid(): string {
  return crypto.randomUUID()
}

const PASSWORD = 'rls-test-password-123'

// A live 60-minute window, matching CURRENT_LEVEL_TTL_MINUTES. Fixed at module
// load so the two ends of a current-level row never drift apart.
const SET_AT = new Date().toISOString()
const EXPIRES_AT = new Date(Date.now() + 60 * 60_000).toISOString()

interface TableSpec {
  table: string
  makeRowA: (userId: string) => Record<string, unknown>
  makeRowB: (userId: string) => Record<string, unknown>
  /** Unique filter for B's row, used when A attempts cross-user access. */
  filterB: (rowB: Record<string, unknown>) => Record<string, unknown>
  /** A benign mutation A attempts on B's row (must not be applied). */
  mutate: { column: string; value: unknown }
  /** Optional setup (e.g. parent entries for images) before rows are built. */
  before?: () => Promise<void>
}

suite('RLS security', () => {
  const url = envUrl as string
  const anonKey = envAnonKey as string
  const serviceKey = envServiceKey

  let anon: SupabaseClient
  let admin: SupabaseClient
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let userA: User | null = null
  let userB: User | null = null

  beforeAll(async () => {
    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: createdA, error: errA } = await admin.auth.admin.createUser({
      email: `rls-a-${uuid()}@bloom.app`,
      password: PASSWORD,
      email_confirm: true,
    })
    const { data: createdB, error: errB } = await admin.auth.admin.createUser({
      email: `rls-b-${uuid()}@bloom.app`,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errA || errB || !createdA.user || !createdB.user) {
      throw new Error(`could not create RLS test users: ${errA?.message ?? ''} ${errB?.message ?? ''}`)
    }
    userA = createdA.user
    userB = createdB.user

    clientA = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    clientB = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: signInA } = await clientA.auth.signInWithPassword({
      email: userA.email as string,
      password: PASSWORD,
    })
    const { error: signInB } = await clientB.auth.signInWithPassword({
      email: userB.email as string,
      password: PASSWORD,
    })
    if (signInA || signInB) {
      throw new Error(`could not sign in RLS test users: ${signInA?.message ?? ''} ${signInB?.message ?? ''}`)
    }
  })

  afterAll(async () => {
    // Deleting the auth users cascades (ON DELETE CASCADE) to their steady_* rows.
    if (userA) await admin.auth.admin.deleteUser(userA.id)
    if (userB) await admin.auth.admin.deleteUser(userB.id)
  })

  let entryAId = ''
  let entryBId = ''
  let medAId = ''
  let medBId = ''
  let scaleAId = ''
  let scaleBId = ''
  let levelAId = ''
  let levelBId = ''
  let currentLevelAId = ''
  let currentLevelBId = ''

  const specs: TableSpec[] = [
    {
      table: 'steady_profiles',
      makeRowA: (uid) => ({ user_id: uid }),
      makeRowB: (uid) => ({ user_id: uid }),
      filterB: (rowB) => ({ user_id: rowB.user_id }),
      mutate: { column: 'theme', value: 'dark' },
    },
    {
      table: 'steady_pins',
      makeRowA: (uid) => ({ user_id: uid, tool_id: 'jar', position: 0 }),
      makeRowB: (uid) => ({ user_id: uid, tool_id: 'timeline', position: 0 }),
      filterB: (rowB) => ({ user_id: rowB.user_id, tool_id: rowB.tool_id }),
      mutate: { column: 'position', value: 99 },
    },
    {
      table: 'steady_jar_days',
      makeRowA: (uid) => ({ user_id: uid, date: '2026-08-15', total_spoons: 12 }),
      makeRowB: (uid) => ({ user_id: uid, date: '2026-08-16', total_spoons: 12 }),
      filterB: (rowB) => ({ user_id: rowB.user_id, date: rowB.date }),
      mutate: { column: 'total_spoons', value: 99 },
    },
    {
      table: 'steady_jar_logs',
      makeRowA: (uid) => ({ user_id: uid, id: uuid(), date: '2026-08-15', spent: 0.5, label: 'a-label' }),
      makeRowB: (uid) => ({ user_id: uid, id: uuid(), date: '2026-08-15', spent: 1, label: 'b-label' }),
      filterB: (rowB) => ({ id: rowB.id }),
      mutate: { column: 'label', value: 'hacked' },
    },
    {
      table: 'steady_timeline_entries',
      makeRowA: (uid) => ({ user_id: uid, id: uuid(), title: 'A event', start_date: '2026-08-15', color: '#ff0000' }),
      makeRowB: (uid) => ({ user_id: uid, id: uuid(), title: 'B event', start_date: '2026-08-15', color: '#ff0000' }),
      filterB: (rowB) => ({ id: rowB.id }),
      mutate: { column: 'title', value: 'hacked' },
    },
    {
      table: 'steady_timeline_zones',
      makeRowA: (uid) => ({ user_id: uid, id: uuid(), name: 'A zone', color: '#ff0000', start_date: '2026-08-15' }),
      makeRowB: (uid) => ({ user_id: uid, id: uuid(), name: 'B zone', color: '#ff0000', start_date: '2026-08-15' }),
      filterB: (rowB) => ({ id: rowB.id }),
      mutate: { column: 'name', value: 'hacked' },
    },
    {
      table: 'steady_timeline_images',
      makeRowA: () => ({ user_id: userA?.id, id: uuid(), entry_id: entryAId, storage_path: `a/${entryAId}/a.jpg` }),
      makeRowB: () => ({ user_id: userB?.id, id: uuid(), entry_id: entryBId, storage_path: `b/${entryBId}/b.jpg` }),
      filterB: (rowB) => ({ id: rowB.id }),
      mutate: { column: 'storage_path', value: 'hacked.jpg' },
      before: async () => {
        const { data: ea } = await clientA
          .from('steady_timeline_entries')
          .insert({ user_id: userA?.id, id: uuid(), title: 'A parent', start_date: '2026-08-15', color: '#ff0000' })
          .select()
        const { data: eb } = await clientB
          .from('steady_timeline_entries')
          .insert({ user_id: userB?.id, id: uuid(), title: 'B parent', start_date: '2026-08-15', color: '#ff0000' })
          .select()
        entryAId = ea?.[0]?.id ?? ''
        entryBId = eb?.[0]?.id ?? ''
        if (!entryAId || !entryBId) {
          throw new Error('could not create parent entries for images spec')
        }
      },
    },
    {
      table: 'steady_breathe_meds',
      makeRowA: (uid) => ({ user_id: uid, name: 'A med', med_type: 'controller' }),
      makeRowB: (uid) => ({ user_id: uid, name: 'B med', med_type: 'reliever' }),
      filterB: (rowB) => ({ user_id: rowB.user_id, name: rowB.name }),
      mutate: { column: 'name', value: 'hacked' },
    },
    {
      table: 'steady_breathe_checkins',
      makeRowA: (uid) => ({ user_id: uid, date: '2026-09-16', peak_flow: 450 }),
      makeRowB: (uid) => ({ user_id: uid, date: '2026-09-17', peak_flow: 420 }),
      filterB: (rowB) => ({ user_id: rowB.user_id, date: rowB.date }),
      mutate: { column: 'peak_flow', value: 999 },
    },
    {
      table: 'steady_breathe_dose_logs',
      makeRowA: () => ({ user_id: userA?.id, id: uuid(), med_id: medAId, date: '2026-09-16', time: '14:30' }),
      makeRowB: () => ({ user_id: userB?.id, id: uuid(), med_id: medBId, date: '2026-09-16', time: '15:00' }),
      filterB: (rowB) => ({ id: rowB.id }),
      mutate: { column: 'time', value: '23:59' },
      before: async () => {
        const { data: ma } = await clientA
          .from('steady_breathe_meds')
          .insert({ user_id: userA?.id, name: 'A dose med', med_type: 'reliever' })
          .select()
        const { data: mb } = await clientB
          .from('steady_breathe_meds')
          .insert({ user_id: userB?.id, name: 'B dose med', med_type: 'reliever' })
          .select()
        medAId = ma?.[0]?.id ?? ''
        medBId = mb?.[0]?.id ?? ''
        if (!medAId || !medBId) {
          throw new Error('could not create parent meds for dose logs spec')
        }
      },
    },
    {
      table: 'steady_lantern_scales',
      makeRowA: (uid) => ({ user_id: uid, name: 'A scale', level_count: 10 }),
      makeRowB: (uid) => ({ user_id: uid, name: 'B scale', level_count: 10 }),
      filterB: (rowB) => ({ user_id: rowB.user_id, name: rowB.name }),
      mutate: { column: 'name', value: 'hacked' },
    },
    {
      table: 'steady_lantern_levels',
      makeRowA: (uid) => ({ user_id: uid, id: uuid(), scale_id: scaleAId, position: 1, label: 'A level', description: '', actions: [] }),
      makeRowB: (uid) => ({ user_id: uid, id: uuid(), scale_id: scaleBId, position: 1, label: 'B level', description: '', actions: [] }),
      filterB: (rowB) => ({ id: rowB.id }),
      mutate: { column: 'label', value: 'hacked' },
      before: async () => {
        const { data: sa } = await clientA
          .from('steady_lantern_scales')
          .insert({ user_id: userA?.id, name: 'A level scale', level_count: 10 })
          .select()
        const { data: sb } = await clientB
          .from('steady_lantern_scales')
          .insert({ user_id: userB?.id, name: 'B level scale', level_count: 10 })
          .select()
        scaleAId = sa?.[0]?.id ?? ''
        scaleBId = sb?.[0]?.id ?? ''
        if (!scaleAId || !scaleBId) {
          throw new Error('could not create parent scales for levels spec')
        }
      },
    },
    {
      table: 'steady_lantern_images',
      makeRowA: () => ({ user_id: userA?.id, id: uuid(), level_id: levelAId, storage_path: `a/${levelAId}/a.jpg` }),
      makeRowB: () => ({ user_id: userB?.id, id: uuid(), level_id: levelBId, storage_path: `b/${levelBId}/b.jpg` }),
      filterB: (rowB) => ({ id: rowB.id }),
      mutate: { column: 'storage_path', value: 'hacked.jpg' },
      before: async () => {
        const { data: sa } = await clientA
          .from('steady_lantern_scales')
          .insert({ user_id: userA?.id, name: 'A image scale', level_count: 10 })
          .select()
        const { data: sb } = await clientB
          .from('steady_lantern_scales')
          .insert({ user_id: userB?.id, name: 'B image scale', level_count: 10 })
          .select()
        const scaleA = sa?.[0]?.id ?? ''
        const scaleB = sb?.[0]?.id ?? ''
        if (!scaleA || !scaleB) {
          throw new Error('could not create parent scales for images spec')
        }
        const { data: la } = await clientA
          .from('steady_lantern_levels')
          .insert({ user_id: userA?.id, id: uuid(), scale_id: scaleA, position: 1, label: 'A image level', description: '', actions: [] })
          .select()
        const { data: lb } = await clientB
          .from('steady_lantern_levels')
          .insert({ user_id: userB?.id, id: uuid(), scale_id: scaleB, position: 1, label: 'B image level', description: '', actions: [] })
          .select()
        levelAId = la?.[0]?.id ?? ''
        levelBId = lb?.[0]?.id ?? ''
        if (!levelAId || !levelBId) {
          throw new Error('could not create parent levels for images spec')
        }
      },
    },
    {
      table: 'steady_lantern_shares',
      makeRowA: (uid) => ({ user_id: uid, scale_id: scaleAId, label: 'A share' }),
      makeRowB: (uid) => ({ user_id: uid, scale_id: scaleBId, label: 'B share' }),
      filterB: (rowB) => ({ user_id: rowB.user_id, label: rowB.label }),
      mutate: { column: 'label', value: 'hacked' },
      before: async () => {
        const { data: sa } = await clientA
          .from('steady_lantern_scales')
          .insert({ user_id: userA?.id, name: 'A share scale', level_count: 10 })
          .select()
        const { data: sb } = await clientB
          .from('steady_lantern_scales')
          .insert({ user_id: userB?.id, name: 'B share scale', level_count: 10 })
          .select()
        scaleAId = sa?.[0]?.id ?? ''
        scaleBId = sb?.[0]?.id ?? ''
        if (!scaleAId || !scaleBId) {
          throw new Error('could not create parent scales for shares spec')
        }
      },
    },
    {
      table: 'steady_lantern_current_levels',
      makeRowA: (uid) => ({ user_id: uid, id: uuid(), level_id: currentLevelAId, set_at: SET_AT, expires_at: EXPIRES_AT }),
      makeRowB: (uid) => ({ user_id: uid, id: uuid(), level_id: currentLevelBId, set_at: SET_AT, expires_at: EXPIRES_AT }),
      filterB: (rowB) => ({ user_id: rowB.user_id, id: rowB.id }),
      mutate: { column: 'expires_at', value: '2099-01-01T00:00:00.000Z' },
      before: async () => {
        const { data: sa } = await clientA
          .from('steady_lantern_scales')
          .insert({ user_id: userA?.id, name: 'A current scale', level_count: 10 })
          .select()
        const { data: sb } = await clientB
          .from('steady_lantern_scales')
          .insert({ user_id: userB?.id, name: 'B current scale', level_count: 10 })
          .select()
        const scaleA = sa?.[0]?.id ?? ''
        const scaleB = sb?.[0]?.id ?? ''
        if (!scaleA || !scaleB) {
          throw new Error('could not create parent scales for current levels spec')
        }
        const { data: la } = await clientA
          .from('steady_lantern_levels')
          .insert({ user_id: userA?.id, id: uuid(), scale_id: scaleA, position: 1, label: 'A current level', description: '', actions: [] })
          .select()
        const { data: lb } = await clientB
          .from('steady_lantern_levels')
          .insert({ user_id: userB?.id, id: uuid(), scale_id: scaleB, position: 1, label: 'B current level', description: '', actions: [] })
          .select()
        currentLevelAId = la?.[0]?.id ?? ''
        currentLevelBId = lb?.[0]?.id ?? ''
        if (!currentLevelAId || !currentLevelBId) {
          throw new Error('could not create parent levels for current levels spec')
        }
      },
    },
  ]

  const zeroRows = (res: { error: unknown; data: unknown[] | null }): boolean =>
    res.error != null || (res.data ?? []).length === 0

  const assertTableIsolation = async (spec: TableSpec): Promise<void> => {
    const userAId = userA?.id as string
    const userBId = userB?.id as string

    if (spec.before) await spec.before()

    const rowA = spec.makeRowA(userAId)
    const rowB = spec.makeRowB(userBId)
    const filterB = spec.filterB(rowB)

    // (b) user A can insert and read back their own row
    const insA = await clientA.from(spec.table).insert(rowA).select()
    expect(insA.error, `${spec.table}: A insert failed`).toBeNull()
    expect((insA.data ?? []).length, `${spec.table}: A insert returned a row`).toBeGreaterThan(0)

    // setup: user B inserts their own row so cross-user assertions have a target
    const insB = await clientB.from(spec.table).insert(rowB).select()
    expect(insB.error, `${spec.table}: B insert failed`).toBeNull()

    const own = await clientA.from(spec.table).select('*').match({ user_id: userAId })
    expect(own.error, `${spec.table}: A read-own failed`).toBeNull()
    expect((own.data ?? []).length, `${spec.table}: A can read their own row`).toBeGreaterThan(0)

    // (c) user A CANNOT select user B's row
    const crossSel = await clientA.from(spec.table).select('*').match(filterB)
    expect(crossSel.error, `${spec.table}: A select-B errored unexpectedly`).toBeNull()
    expect((crossSel.data ?? []).length, `${spec.table}: A must not see B's row`).toBe(0)

    // (c) user A CANNOT update user B's row
    const crossUpd = await clientA
      .from(spec.table)
      .update({ [spec.mutate.column]: spec.mutate.value })
      .match(filterB)
      .select()
    expect(zeroRows(crossUpd), `${spec.table}: A update of B's row must be blocked`).toBe(true)
    const bAfterUpd = await admin
      .from(spec.table)
      .select(spec.mutate.column)
      .match(filterB)
      .single()
    expect(bAfterUpd.error, `${spec.table}: admin read after update failed`).toBeNull()
    const updatedValue = (bAfterUpd.data as Record<string, unknown> | null)?.[spec.mutate.column]
    expect(updatedValue, `${spec.table}: B's row must be unchanged after A's update`).not.toBe(
      spec.mutate.value,
    )

    // (c) user A CANNOT delete user B's row
    const crossDel = await clientA.from(spec.table).delete().match(filterB).select()
    expect(zeroRows(crossDel), `${spec.table}: A delete of B's row must be blocked`).toBe(true)
    const bAfterDel = await admin.from(spec.table).select('*').match(filterB).single()
    expect(bAfterDel.error, `${spec.table}: admin read after delete failed`).toBeNull()
    expect(bAfterDel.data, `${spec.table}: B's row must still exist after A's delete`).toBeTruthy()

    // (a) unauthenticated select is denied (empty result or permission error)
    const anonSel = await anon.from(spec.table).select('*')
    expect(
      zeroRows(anonSel as { error: unknown; data: unknown[] | null }),
      `${spec.table}: anonymous select must return nothing`,
    ).toBe(true)

    // (d) anonymous insert is blocked (fresh uuid avoids PK collisions)
    const anonRow = spec.makeRowA(uuid())
    const anonIns = await anon.from(spec.table).insert(anonRow).select()
    expect(
      zeroRows(anonIns as { error: unknown; data: unknown[] | null }),
      `${spec.table}: anonymous insert must be blocked`,
    ).toBe(true)
  }

  it.each(specs)('$table is owner-isolated', async (spec) => {
    await assertTableIsolation(spec)
  })

  /**
   * steady_lantern_partnerships — bespoke, deliberately not a TableSpec.
   *
   * The table has no `user_id`: ownership is the PAIR (sharer_id, partner_id),
   * and the generic harness is built on the single-owner shape. It reads the
   * caller's own row back with a hard-coded `.match({ user_id: userAId })`,
   * which errors out here, and it asserts that A is blind to "B's row" — but
   * a two-party table inverts that: the row B invited A to is A's own row
   * (partner policy), and the row A sent is invisible to B until B is added to
   * it. A generic spec would therefore assert the wrong thing, so the pair
   * semantics are written out longhand below.
   *
   * A third throwaway account is created because with only A and B every row
   * involves both of them, and "cannot see a stranger's row" is then untestable.
   */
  it('steady_lantern_partnerships is scoped to the sharer/partner pair', async () => {
    const userAId = userA?.id as string
    const userBId = userB?.id as string

    const { data: createdC, error: errC } = await admin.auth.admin.createUser({
      email: `rls-c-${uuid()}@bloom.app`,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errC || !createdC.user) {
      throw new Error(`could not create the third RLS test user: ${errC?.message ?? ''}`)
    }
    const userCId = createdC.user.id
    const clientC = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: signInC } = await clientC.auth.signInWithPassword({
      email: createdC.user.email as string,
      password: PASSWORD,
    })
    if (signInC) {
      throw new Error(`could not sign in the third RLS test user: ${signInC.message}`)
    }

    try {
      // A invites B. The sharer policy owns both ends of this write.
      const invAB = await clientA
        .from('steady_lantern_partnerships')
        .insert({ sharer_id: userAId, partner_id: userBId, status: 'pending' })
        .select()
      expect(invAB.error, 'A invite to B failed').toBeNull()
      const rowAB = (invAB.data ?? [])[0] as { id: string } | undefined
      expect(rowAB?.id, 'A invite to B returned a row').toBeTruthy()

      // A cannot forge the mirror invite: the partner has no INSERT policy and
      // the sharer policy's WITH CHECK pins sharer_id to auth.uid(), so A can
      // never put itself on the sharer side of someone else's invitation.
      const forged = await clientA
        .from('steady_lantern_partnerships')
        .insert({ sharer_id: userBId, partner_id: userAId, status: 'active' })
        .select()
      expect(zeroRows(forged), 'A must not insert a row that makes B the sharer').toBe(true)
      const forgedRows = await admin
        .from('steady_lantern_partnerships')
        .select('id')
        .match({ sharer_id: userBId, partner_id: userAId })
      expect((forgedRows.data ?? []).length, 'the forged row must not exist').toBe(0)

      // Nobody may share with themselves (steady_lantern_partnerships_distinct_people).
      const selfish = await clientA
        .from('steady_lantern_partnerships')
        .insert({ sharer_id: userAId, partner_id: userAId })
        .select()
      expect(zeroRows(selfish), 'a self-partnership must be rejected').toBe(true)

      // B invites A — the incoming side, the one the partner pane reads.
      const invBA = await clientB
        .from('steady_lantern_partnerships')
        .insert({ sharer_id: userBId, partner_id: userAId, status: 'pending' })
        .select()
      expect(invBA.error, 'B invite to A failed').toBeNull()
      const rowBA = (invBA.data ?? [])[0] as { id: string } | undefined
      expect(rowBA?.id, 'B invite to A returned a row').toBeTruthy()

      // B invites C, so there is one row that involves neither test user.
      const invBC = await clientB
        .from('steady_lantern_partnerships')
        .insert({ sharer_id: userBId, partner_id: userCId, status: 'pending' })
        .select()
      expect(invBC.error, 'B invite to C failed').toBeNull()
      const rowBC = (invBC.data ?? [])[0] as { id: string } | undefined
      expect(rowBC?.id, 'B invite to C returned a row').toBeTruthy()

      // Both sides of a pair are visible to both members, and nobody else.
      const aSees = await clientA.from('steady_lantern_partnerships').select('*')
      expect(aSees.error, 'A select failed').toBeNull()
      expect((aSees.data ?? []).length, 'A sees the pair A is in, and only that').toBe(2)
      const cSees = await clientC.from('steady_lantern_partnerships').select('*')
      expect((cSees.data ?? []).length, 'C sees only the pair C is in').toBe(1)

      // A cannot reach the row B sent to C — not read it, change it, or delete it.
      const crossSel = await clientA.from('steady_lantern_partnerships').select('*').match({ id: rowBC?.id })
      expect((crossSel.data ?? []).length, 'A must not see a pair A is not in').toBe(0)
      const crossUpd = await clientA
        .from('steady_lantern_partnerships')
        .update({ status: 'revoked' })
        .match({ id: rowBC?.id })
        .select()
      expect(zeroRows(crossUpd), 'A must not update a pair A is not in').toBe(true)
      const crossDel = await clientA
        .from('steady_lantern_partnerships')
        .delete()
        .match({ id: rowBC?.id })
        .select()
      expect(zeroRows(crossDel), 'A must not delete a pair A is not in').toBe(true)
      const bcAfter = await admin
        .from('steady_lantern_partnerships')
        .select('status')
        .match({ id: rowBC?.id })
        .single()
      expect(bcAfter.data?.status, 'B and C keep their pair').toBe('pending')

      // The partner side answers its invitation: accept, then decline. Both are
      // the same status-only update on the row the sharer sent.
      const accept = await clientA
        .from('steady_lantern_partnerships')
        .update({ status: 'active' })
        .match({ id: rowBA?.id })
        .select()
      expect((accept.data ?? []).length, 'the invitee can accept').toBe(1)
      const decline = await clientA
        .from('steady_lantern_partnerships')
        .update({ status: 'revoked' })
        .match({ id: rowBA?.id })
        .select()
      expect((decline.data ?? []).length, 'the invitee can decline').toBe(1)
      const baAfter = await admin
        .from('steady_lantern_partnerships')
        .select('status')
        .match({ id: rowBA?.id })
        .single()
      expect(baAfter.data?.status, 'the decline stuck').toBe('revoked')

      // The partner side may answer but never remove: only the sharer can.
      const partnerDel = await clientA
        .from('steady_lantern_partnerships')
        .delete()
        .match({ id: rowBA?.id })
        .select()
      expect(zeroRows(partnerDel), 'the invitee must not delete the pair').toBe(true)
      const baStill = await admin
        .from('steady_lantern_partnerships')
        .select('id')
        .match({ id: rowBA?.id })
        .single()
      expect(baStill.data, 'the pair survives the invitee delete').toBeTruthy()

      // The sharer side withdraws its own invitation.
      const revoke = await clientB
        .from('steady_lantern_partnerships')
        .update({ status: 'revoked' })
        .match({ id: rowAB?.id })
        .select()
      expect((revoke.data ?? []).length, 'the sharer can withdraw').toBe(1)
      const abAfter = await admin
        .from('steady_lantern_partnerships')
        .select('status')
        .match({ id: rowAB?.id })
        .single()
      expect(abAfter.data?.status, 'the withdrawal stuck').toBe('revoked')

      // The same shape, far smaller consequence: the sharer policy is `for all`,
      // so a sharer can flip its own invitation to 'active' without the invitee
      // ever answering, while the UI says "Waiting for them to accept". Not a
      // leak — the sharer could already insert the row and flip it — but it is
      // a promise the database does not keep, so it is pinned here too.
      const selfInvited = await clientA
        .from('steady_lantern_partnerships')
        .insert({ sharer_id: userAId, partner_id: userCId, status: 'pending' })
        .select()
      const selfRow = (selfInvited.data ?? [])[0] as { id: string } | undefined
      expect(selfRow?.id, 'A invite to C returned a row').toBeTruthy()
      const selfAccept = await clientA
        .from('steady_lantern_partnerships')
        .update({ status: 'active' })
        .match({ id: selfRow?.id })
        .select()
      expect(
        (selfAccept.data ?? []).length,
        'a sharer must not activate its own invite — only the partner may',
      ).toBe(0)
      const selfStillPending = await admin
        .from('steady_lantern_partnerships')
        .select('status')
        .match({ id: selfRow?.id })
        .single()
      expect(selfStillPending.data?.status, 'the self-accept did not take effect').toBe('pending')

      // The identity of a pair is immutable. RLS alone cannot enforce this: a
      // WITH CHECK clause only sees the NEW row, and Postgres ORs the checks of
      // every policy that applies to the command — so the partner policy (which
      // pins partner_id) left sharer_id rewriteable. Migration 010 therefore
      // locks both columns with a BEFORE UPDATE trigger, the only place that
      // can compare the old row to the new one. Without it, an invitee could
      // re-point sharer_id at a third account and then read that account's
      // whole lantern through get_partner_status().
      const hijack = await clientA
        .from('steady_lantern_partnerships')
        .update({ sharer_id: userCId, status: 'active' })
        .match({ id: rowBA?.id })
        .select()
      expect((hijack.data ?? []).length, 'the invitee must not re-point the sharer').toBe(0)
      expect(hijack.error, 'the re-point is refused outright, not silently filtered').not.toBeNull()
      const baAfterRepoint = await admin
        .from('steady_lantern_partnerships')
        .select('sharer_id, status')
        .match({ id: rowBA?.id })
        .single()
      expect(baAfterRepoint.data?.sharer_id, 'the sharer is unchanged').toBe(userBId)
      expect(
        baAfterRepoint.data?.status,
        'and a rejected re-point cannot smuggle in an activation',
      ).not.toBe('active')

      // (a) + (d) from the file header: anon reads nothing and writes nothing.
      const anonSel = await anon.from('steady_lantern_partnerships').select('*')
      expect(
        zeroRows(anonSel as { error: unknown; data: unknown[] | null }),
        'anonymous select must return nothing',
      ).toBe(true)
      const anonIns = await anon
        .from('steady_lantern_partnerships')
        // A pair no test user holds, so only RLS can be what blocks it.
        .insert({ sharer_id: userCId, partner_id: userBId })
        .select()
      expect(
        zeroRows(anonIns as { error: unknown; data: unknown[] | null }),
        'anonymous insert must be blocked',
      ).toBe(true)
    } finally {
      await admin.auth.admin.deleteUser(userCId)
    }
  })
})
