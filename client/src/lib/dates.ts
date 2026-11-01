// Display helpers for date-only ISO strings (YYYY-MM-DD). Date arithmetic lives in @celebrai/shared.
import { daysBetween } from '@celebrai/shared'

export { addDays, daysBetween } from '@celebrai/shared'

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  return new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'UTC' }).format(toUTC(iso))
}

export function relativeDays(iso: string, today: string = todayISO()): string {
  const n = daysBetween(today, iso)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  return n > 0 ? `In ${n} days` : `${-n} days ago`
}
