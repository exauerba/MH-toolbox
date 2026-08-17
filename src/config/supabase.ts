/**
 * steady — Supabase client setup.
 *
 * The shared client is used by the repository provider and the auth service.
 * `supabase` is null when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
 * absent, in which case the app runs in guest mode (local-only repository,
 * no auth UI).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null