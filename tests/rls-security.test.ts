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
})
