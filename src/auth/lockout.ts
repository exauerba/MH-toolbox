/**
 * Client-side sign-in lockout (pure logic, no browser/DOM dependencies).
 *
 * Mirrors bloom's proven pattern: after `maxFailedAttempts` consecutive failed
 * sign-ins, block attempts until a 60s window elapses. A clock is injectable so
 * the behaviour is unit-testable without waiting on real time.
 */

export interface LockoutConfig {
  /** Consecutive failures before the lock engages. */
  maxFailedAttempts: number
  /** How long a lock lasts, in milliseconds. */
  lockoutMs: number
}

export interface LockoutClock {
  now(): number
}

export interface LockoutStatus {
  locked: boolean
  /** Milliseconds until the lock clears (0 when not locked). */
  remainingMs: number
  /** Whole seconds until the lock clears (ceiling), for UI copy. */
  remainingSeconds: number
}

export const defaultLockoutConfig: LockoutConfig = {
  maxFailedAttempts: 5,
  lockoutMs: 60_000,
}

export const systemClock: LockoutClock = {
  now: () => Date.now(),
}

export class FailedAttemptLockout {
  private readonly config: LockoutConfig
  private readonly clock: LockoutClock
  private failedAttempts = 0
  private lockedUntil = 0

  constructor(config: LockoutConfig = defaultLockoutConfig, clock: LockoutClock = systemClock) {
    this.config = config
    this.clock = clock
  }

  isLocked(): boolean {
    return this.clock.now() < this.lockedUntil
  }

  status(): LockoutStatus {
    const remainingMs = Math.max(0, this.lockedUntil - this.clock.now())
    return {
      locked: this.isLocked(),
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
    }
  }

  /**
   * Register one failed attempt. Returns the status after the attempt.
   * A lock, once engaged, is not extended by further attempts.
   */
  recordFailure(): LockoutStatus {
    if (this.isLocked()) {
      return this.status()
    }
    this.failedAttempts += 1
    if (this.failedAttempts >= this.config.maxFailedAttempts) {
      this.lockedUntil = this.clock.now() + this.config.lockoutMs
      this.failedAttempts = 0
    }
    return this.status()
  }

  /** Register a successful sign-in: clears the failure counter and any lock. */
  recordSuccess(): void {
    this.failedAttempts = 0
    this.lockedUntil = 0
  }

  reset(): void {
    this.failedAttempts = 0
    this.lockedUntil = 0
  }
}
