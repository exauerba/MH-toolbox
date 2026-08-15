import { describe, expect, it } from 'vitest'
import { FailedAttemptLockout, defaultLockoutConfig, type LockoutClock } from '../src/auth/lockout'

class FakeClock implements LockoutClock {
  t = 0
  now(): number {
    return this.t
  }
  advance(ms: number): void {
    this.t += ms
  }
}

const fiveSixty = { maxFailedAttempts: 5, lockoutMs: 60_000 }

describe('FailedAttemptLockout', () => {
  it('locks after the configured number of failures and reports the window', () => {
    const clock = new FakeClock()
    const lockout = new FailedAttemptLockout(fiveSixty, clock)
    for (let i = 0; i < 4; i += 1) {
      expect(lockout.recordFailure().locked).toBe(false)
    }
    const status = lockout.recordFailure()
    expect(status.locked).toBe(true)
    expect(status.remainingMs).toBe(60_000)
    expect(status.remainingSeconds).toBe(60)
  })

  it('stays locked until the window passes, then unlocks', () => {
    const clock = new FakeClock()
    const lockout = new FailedAttemptLockout(fiveSixty, clock)
    for (let i = 0; i < 5; i += 1) lockout.recordFailure()
    expect(lockout.isLocked()).toBe(true)

    clock.advance(59_999)
    expect(lockout.isLocked()).toBe(true)
    expect(lockout.status().remainingSeconds).toBe(1)

    clock.advance(1)
    expect(lockout.isLocked()).toBe(false)
    expect(lockout.status().remainingSeconds).toBe(0)
  })

  it('a successful attempt resets the failure counter', () => {
    const clock = new FakeClock()
    const lockout = new FailedAttemptLockout(fiveSixty, clock)
    for (let i = 0; i < 4; i += 1) lockout.recordFailure()
    expect(lockout.isLocked()).toBe(false)

    lockout.recordSuccess()
    lockout.recordFailure()
    expect(lockout.isLocked()).toBe(false)
  })

  it('does not extend an active lock with further failures', () => {
    const clock = new FakeClock()
    const lockout = new FailedAttemptLockout(fiveSixty, clock)
    for (let i = 0; i < 6; i += 1) lockout.recordFailure()
    expect(lockout.isLocked()).toBe(true)

    clock.advance(59_999)
    expect(lockout.isLocked()).toBe(true)
    clock.advance(1)
    expect(lockout.isLocked()).toBe(false)
  })

  it('reports remaining seconds with ceiling', () => {
    const clock = new FakeClock()
    const lockout = new FailedAttemptLockout({ maxFailedAttempts: 1, lockoutMs: 60_000 }, clock)
    lockout.recordFailure()
    clock.advance(1001)
    expect(lockout.status().remainingSeconds).toBe(59)
    expect(lockout.status().remainingMs).toBe(58_999)
  })

  it('defaults to 5 failures / 60s', () => {
    expect(defaultLockoutConfig.maxFailedAttempts).toBe(5)
    expect(defaultLockoutConfig.lockoutMs).toBe(60_000)

    const lockout = new FailedAttemptLockout(undefined, new FakeClock())
    expect(lockout.status().locked).toBe(false)
  })

  it('reset() clears failures and any lock', () => {
    const clock = new FakeClock()
    const lockout = new FailedAttemptLockout({ maxFailedAttempts: 1, lockoutMs: 60_000 }, clock)
    lockout.recordFailure()
    expect(lockout.isLocked()).toBe(true)
    lockout.reset()
    expect(lockout.isLocked()).toBe(false)
  })
})
