export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2026-01-05" → "5 Jan 2026" */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  const monthName = MONTHS[Number(month) - 1] ?? iso
  return `${Number(day)} ${monthName} ${year}`
}