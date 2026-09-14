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

// Security: keep the auth session in memory only. Persisting it (supabase-js
// default) would write the access + refresh JWTs to localStorage in plaintext,
// so a single XSS or injected script could exfiltrate the whole account.
// Tradeoff: the user re-authenticates after a full page reload.
export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null