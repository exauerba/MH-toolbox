/**
 * Day-window math for steady.
 *
 * A jar "day" is not midnight-to-midnight: it starts at the user's reset hour
 * (default 0). `dayForDate` answers "which local calendar day does this
 * timestamp belong to?" — used at write time to attribute jar logs.
 * All dates are local wall-clock YYYY-MM-DD strings; `toISOString()` is never
 * used because it shifts to UTC and can land on the wrong calendar day.
 */

/** Local calendar date for a timestamp under a reset hour, as YYYY-MM-DD. */
export function dayForDate(d: Date, resetHour: number): string {
  // Shift the clock back by the reset hour; setHours handles negative
  // rollover across midnight and DST transitions on the wall clock.
  const shifted = new Date(d)
  shifted.setHours(shifted.getHours() - resetHour)
  return toISODate(shifted)
}

/** YYYY-MM-DD in local time. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a YYYY-MM-DD string as a local (not UTC) date. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Today's date under the reset hour. */
export function todayForResetHour(resetHour: number): string {
  return dayForDate(new Date(), resetHour)
}