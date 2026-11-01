import type { Minor } from '@celebrai/shared'

export { formatMoney } from '@celebrai/shared'

/**
 * Parses a user-typed major amount ("25000", "25,000.5") into minor units without
 * floating-point math. Returns null for anything that isn't a non-negative amount
 * with at most two decimals, or that exceeds the safe integer range.
 */
export function parseMoney(input: string): Minor | null {
  const cleaned = input.replace(/[,\s]/g, '')
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned)
  if (!match) return null
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(minor) ? minor : null
}

/** Minor units → plain major string for input fields ("25000", "25000.50"). */
export function toMajorInput(minor: Minor): string {
  const major = Math.floor(minor / 100)
  const rest = minor % 100
  return rest === 0 ? String(major) : `${major}.${String(rest).padStart(2, '0')}`
}
