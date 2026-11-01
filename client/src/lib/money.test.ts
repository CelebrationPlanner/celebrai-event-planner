import { describe, expect, it } from 'vitest'
import { addDays, daysBetween } from './dates'
import { formatMoney, parseMoney, toMajorInput } from './money'

describe('parseMoney', () => {
  it('parses whole and decimal amounts into minor units without float error', () => {
    expect(parseMoney('25000')).toBe(2_500_000)
    expect(parseMoney('5,00,000')).toBe(50_000_000)
    expect(parseMoney('0.1')).toBe(10)
    expect(parseMoney('19.99')).toBe(1999)
    expect(parseMoney('0')).toBe(0)
  })

  it('rejects negative, malformed, over-precise and unsafe amounts', () => {
    for (const bad of ['-5', 'abc', '1.234', '', '1e5', '.5', '99999999999999999']) {
      expect(parseMoney(bad), bad).toBeNull()
    }
  })

  it('round-trips through the input format', () => {
    for (const minor of [0, 1, 50, 2_500_000, 1999]) expect(parseMoney(toMajorInput(minor))).toBe(minor)
  })
})

describe('formatMoney', () => {
  it('uses Indian grouping for INR and drops decimals on whole amounts', () => {
    expect(formatMoney(50_000_000, 'INR')).toBe('₹5,00,000')
    expect(formatMoney(1999, 'USD')).toBe('$19.99')
  })
})

describe('date helpers', () => {
  it('crosses month/year boundaries in UTC', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(daysBetween('2026-11-01', '2026-11-13')).toBe(12)
  })
})
