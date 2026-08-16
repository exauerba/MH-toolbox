/**
 * Supabase parity suite. Self-skips unless a local Supabase stack is running
 * (same pattern as tests/rls-security.test.ts) — CI starts one via `supabase start`.
 */
import { createClient } from '@supabase/supabase-js'
import { SupabaseRepository } from '../src/data/supabase/SupabaseRepository'
import { runRepositorySuite } from './parity.suite'

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const isLocal =
  typeof url === 'string' && (url.includes('127.0.0.1:54321') || url.includes('localhost:54321'))
const run = isLocal && url && anonKey && serviceKey ? describe : describe.skip

run('ToolboxRepository parity — supabase', () => {
  it('runs against a local stack', () => {
    expect(url).toMatch(/127\.0\.0\.1:54321|localhost:54321/)
  })

  runRepositorySuite('supabase', async () => {
    const admin = createClient(url!, anonKey!, { auth: { persistSession: false } })
    const service = createClient(url!, serviceKey!, { auth: { persistSession: false } })

    const email = `repo-${crypto.randomUUID()}@bloom.app`
    const password = 'repo-test-password-123'
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) throw createError

    const { data: session, error: signInError } = await admin.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError) throw signInError

    return {
      repo: new SupabaseRepository(admin),
      teardown: async () => {
        await service.auth.admin.deleteUser(created.user.id)
        void session
      },
    }
  })
})