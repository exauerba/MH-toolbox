/**
 * steady — username auth core.
 *
 * Mirrors bloom's `supabase-auth.js` semantics exactly:
 *   - usernames must match USERNAME_RE (/^[a-zA-Z0-9.-]+$/)
 *   - the Supabase email is `${normalizedUsername}@bloom.app` (same namespace as
 *     bloom -> one identity across the toolbox)
 *   - no email verification
 *   - generic errors that never reveal whether an account exists
 *   - client-side lockout after 5 failed attempts (60s window)
 *
 * Pure logic + client wrappers only. NO React/UI in this module; the UI layer
 * (WP4/WP8) consumes the exported functions, types and message constants.
 */
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { supabase } from '../config/supabase'
import { FailedAttemptLockout, type LockoutStatus } from './lockout'

export const USERNAME_RE = /^[a-zA-Z0-9.-]+$/
export const AUTH_EMAIL_DOMAIN = 'bloom.app'
export const PASSWORD_MIN_LENGTH = 6

/**
 * Plain-language messages. These are the ONLY strings auth produces for
 * sign-in / sign-up failures, so the UI can never leak whether a username
 * exists. Export for reuse by WP4/WP8.
 */
export const MESSAGES = {
  NOT_CONFIGURED: 'Supabase is not configured yet.',
  USERNAME_INVALID:
    'Usernames can only use letters, numbers, dots, and dashes. No spaces.',
  SIGN_IN_FAILED: 'Incorrect username or password.',
  SIGN_UP_FAILED: 'Could not create account. Please try again.',
  PASSWORD_TOO_SHORT: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  GENERIC: 'Something went wrong. Please try again.',
} as const

/** Lockout copy, mirroring bloom: "Too many attempts. Try again in Ns." */
export function lockedMessage(remainingSeconds: number): string {
  return `Too many attempts. Try again in ${remainingSeconds}s.`
}

// --- Domain types (consumed by the UI layer) ---

export interface AuthUser {
  id: string
  username: string
}

export interface AuthSession {
  user: AuthUser | null
}

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

// --- Pure helpers (unit-testable without a browser or Supabase) ---

/** `"  Ada-Lou "` -> `"ada-lou"`. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function usernameIsValid(username: string): boolean {
  return USERNAME_RE.test(username)
}

/** The hidden Supabase email for a username, e.g. `"ada-lou@bloom.app"`. */
export function emailFor(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`
}

/** Reverse of `emailFor`: `{ id, username }` from a Supabase user row. */
export function userFromSupabase(user: User | null): AuthUser | null {
  if (!user) return null
  const email = user.email ?? ''
  const suffix = `@${AUTH_EMAIL_DOMAIN}`
  const username = email.endsWith(suffix) ? email.slice(0, email.length - suffix.length) : email
  // Usernames are always lowercase in the shared auth namespace; enforce it so
  // the UI never sees a differently-cased variant of the same identity.
  return { id: user.id, username: username.toLowerCase() }
}

// --- Client wrappers ---

/** Maps a single supabase-js message to the small, non-revealing set. */
function friendlyError(message: string | undefined): string {
  if (!message) return MESSAGES.GENERIC
  const lower = String(message).toLowerCase()
  if (lower.includes('password should be')) return MESSAGES.PASSWORD_TOO_SHORT
  return MESSAGES.GENERIC
}

export interface AuthService {
  /**
   * Create an account. `data` is the signed-in user, or `null` when the account
   * was created but requires confirmation (sign-in separately).
   */
  signUp(username: string, password: string): Promise<AuthResult<AuthUser | null>>
  /** Sign in. Subject to the client-side lockout after repeated failures. */
  signIn(username: string, password: string): Promise<AuthResult<AuthUser>>
  signOut(): Promise<AuthResult<null>>
  /** Current session (null when signed out). */
  getSession(): Promise<AuthResult<AuthSession>>
  /** Current lockout state, for the UI to show countdown copy. */
  lockoutStatus(): LockoutStatus
}

export interface AuthServiceOptions {
  /** Injectable client (defaults to the app's shared `supabase` client). */
  client?: SupabaseClient | null
  /** Injectable lockout (defaults to a fresh 5/60s FailedAttemptLockout). */
  lockout?: FailedAttemptLockout
}

/**
 * Factory so the UI layer (WP4) wires a single service at the app root, and so
 * tests can inject a fake client + clock.
 */
export function createAuthService(options: AuthServiceOptions = {}): AuthService {
  const client = options.client === undefined ? supabase : options.client
  const lockout = options.lockout ?? new FailedAttemptLockout()

  return {
    async signUp(username: string, password: string): Promise<AuthResult<AuthUser | null>> {
      if (!client) return { ok: false, error: MESSAGES.NOT_CONFIGURED }
      if (!USERNAME_RE.test(username)) {
        return { ok: false, error: MESSAGES.USERNAME_INVALID }
      }
      try {
        const { data, error } = await client.auth.signUp({
          email: emailFor(username),
          password,
        })
        if (error) return { ok: false, error: MESSAGES.SIGN_UP_FAILED }
        return { ok: true, data: userFromSupabase(data.user ?? null) }
      } catch {
        return { ok: false, error: MESSAGES.SIGN_UP_FAILED }
      }
    },

    async signIn(username: string, password: string): Promise<AuthResult<AuthUser>> {
      if (!client) return { ok: false, error: MESSAGES.NOT_CONFIGURED }
      if (!USERNAME_RE.test(username)) {
        return { ok: false, error: MESSAGES.USERNAME_INVALID }
      }
      if (lockout.isLocked()) {
        return { ok: false, error: lockedMessage(lockout.status().remainingSeconds) }
      }
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: emailFor(username),
          password,
        })
        const supabaseUser = data.user
        if (error || !supabaseUser) {
          lockout.recordFailure()
          return { ok: false, error: MESSAGES.SIGN_IN_FAILED }
        }
        lockout.recordSuccess()
        return { ok: true, data: userFromSupabase(supabaseUser) as AuthUser }
      } catch {
        lockout.recordFailure()
        return { ok: false, error: MESSAGES.SIGN_IN_FAILED }
      }
    },

    async signOut(): Promise<AuthResult<null>> {
      if (!client) return { ok: false, error: MESSAGES.NOT_CONFIGURED }
      try {
        const { error } = await client.auth.signOut()
        if (error) return { ok: false, error: friendlyError(error.message) }
        return { ok: true, data: null }
      } catch {
        return { ok: false, error: MESSAGES.GENERIC }
      }
    },

    async getSession(): Promise<AuthResult<AuthSession>> {
      if (!client) return { ok: false, error: MESSAGES.NOT_CONFIGURED }
      try {
        const { data, error } = await client.auth.getSession()
        if (error) return { ok: false, error: friendlyError(error.message) }
        return { ok: true, data: { user: userFromSupabase(data.session?.user ?? null) } }
      } catch {
        return { ok: false, error: MESSAGES.GENERIC }
      }
    },

    lockoutStatus(): LockoutStatus {
      return lockout.status()
    },
  }
}
