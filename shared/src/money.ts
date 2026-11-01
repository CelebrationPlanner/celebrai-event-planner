import type { CurrencyCode, Minor } from './schemas.ts'

const LOCALES: Record<CurrencyCode, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'en-IE', GBP: 'en-GB' }

/** Formats integer minor units; whole amounts drop the decimals (₹25,000 not ₹25,000.00). */
export function formatMoney(minor: Minor, currency: CurrencyCode): string {
  const whole = minor % 100 === 0
  return new Intl.NumberFormat(LOCALES[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(minor / 100)
}
