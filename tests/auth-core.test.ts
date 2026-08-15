import { describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

// authCore imports the app client factory, which throws when env vars are
// missing. Mock it so the pure helpers below are testable without Supabase.
vi.mock('../src/config/supabase', () => ({
  supabase: {},
}))

import {
  USERNAME_RE,
  AUTH_EMAIL_DOMAIN,
  MESSAGES,
  lockedMessage,
  normalizeUsername,
  usernameIsValid,
  emailFor,
  userFromSupabase,
} from '../src/auth/authCore'

const fakeUser = (id: string, email: string) => ({ id, email }) as unknown as User

describe('username scheme (mirrors bloom)', () => {
  it('USERNAME_RE accepts letters, numbers, dots, dashes', () => {
    expect(USERNAME_RE.test('ada')).toBe(true)
    expect(USERNAME_RE.test('Ada-Lou')).toBe(true)
    expect(USERNAME_RE.test('user.name123')).toBe(true)
    expect(USERNAME_RE.test('a-b.c')).toBe(true)
  })

  it('USERNAME_RE rejects spaces and special characters', () => {
    expect(USERNAME_RE.test('ada lou')).toBe(false)
    expect(USERNAME_RE.test('ada@bloom')).toBe(false)
    expect(USERNAME_RE.test('ada!')).toBe(false)
    expect(USERNAME_RE.test('')).toBe(false)
  })

  it('normalizeUsername trims and lowercases', () => {
    expect(normalizeUsername('  Ada-Lou ')).toBe('ada-lou')
    expect(normalizeUsername('ADA')).toBe('ada')
  })

  it('usernameIsValid follows USERNAME_RE on the trimmed value', () => {
    expect(usernameIsValid('Ada-Lou')).toBe(true)
    expect(usernameIsValid('has space')).toBe(false)
  })

  it('emailFor builds the shared bloom.app email', () => {
    expect(emailFor('Ada-Lou')).toBe(`ada-lou@${AUTH_EMAIL_DOMAIN}`)
    expect(AUTH_EMAIL_DOMAIN).toBe('bloom.app')
  })

  it('userFromSupabase maps a bloom-email user back to { id, username }', () => {
    expect(userFromSupabase(fakeUser('u1', 'Ada-Lou@bloom.app'))).toEqual({
      id: 'u1',
      username: 'ada-lou',
    })
  })

  it('userFromSupabase passes through non-bloom emails verbatim and null for no user', () => {
    expect(userFromSupabase(null)).toBeNull()
    expect(userFromSupabase(fakeUser('u2', 'x@example.com'))?.username).toBe('x@example.com')
  })
})

describe('auth messages', () => {
  it('exposes generic, non-revealing constants for the UI layer', () => {
    expect(MESSAGES.SIGN_IN_FAILED).toBe('Incorrect username or password.')
    expect(MESSAGES.SIGN_UP_FAILED).toBe('Could not create account. Please try again.')
    expect(MESSAGES.USERNAME_INVALID).toContain('letters, numbers, dots, and dashes')
    expect(MESSAGES.PASSWORD_TOO_SHORT).toBe('Password must be at least 6 characters.')
  })

  it('lockedMessage reports the remaining seconds', () => {
    expect(lockedMessage(47)).toBe('Too many attempts. Try again in 47s.')
  })
})
