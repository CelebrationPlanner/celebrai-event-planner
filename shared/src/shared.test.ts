import { describe, expect, it } from 'vitest'
import { summarizeBudget } from './budget.ts'
import type { BudgetCategory } from './schemas.ts'
import { addDays, daysBetween, todayInTimeZone } from './dates.ts'
import { budgetUpdateSchema, eventCreateSchema, eventUpdateSchema, isoDateSchema, minorSchema, profileUpdateSchema, taskCreateSchema } from './schemas.ts'

const row = (category: BudgetCategory, estimatedMinor: number, actualMinor: number | null = null) => ({ category, estimatedMinor, actualMinor }) as const

describe('summarizeBudget', () => {
  it('balances when allocations equal the budget', () => {
    const s = summarizeBudget(3_000_000, [row('venue', 1_000_000), row('food', 1_700_000), row('contingency', 300_000)])
    expect(s).toMatchObject({ estimatedMinor: 3_000_000, remainingMinor: 0, overrunMinor: 0, warnings: [] })
  })

  it('reports the exact overrun and never changes the budget (Scenario 9: ₹20,000 vs ₹24,000)', () => {
    const s = summarizeBudget(2_000_000, [row('venue', 1_500_000), row('food', 900_000)])
    expect(s.budgetMinor).toBe(2_000_000)
    expect(s.overrunMinor).toBe(400_000)
    expect(s.remainingMinor).toBe(0)
    expect(s.warnings).toContain('Planned allocations exceed the total budget by 400000 minor units.')
  })

  it('tracks actual spend separately and flags categories above estimate', () => {
    const s = summarizeBudget(1_000_000, [row('food', 100_000, 150_000), row('contingency', 50_000)])
    expect(s.actualMinor).toBe(150_000)
    expect(s.warnings).toContain('food spending is above its estimate.')
  })

  it('stays exact at the safe-integer boundary', () => {
    const max = Number.MAX_SAFE_INTEGER
    expect(summarizeBudget(max, [row('venue', max - 1), row('contingency', 1)]).remainingMinor).toBe(0)
  })
})

describe('dates', () => {
  it('computes "today" in the user’s time zone, not the server’s', () => {
    const lateEveningUTC = new Date('2026-11-01T20:00:00Z') // already 2 Nov in India
    expect(todayInTimeZone('Asia/Kolkata', lateEveningUTC)).toBe('2026-11-02')
    expect(todayInTimeZone('America/New_York', lateEveningUTC)).toBe('2026-11-01')
  })

  it('does date arithmetic across month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(daysBetween('2026-11-01', '2026-11-13')).toBe(12)
  })

  it('rejects impossible calendar dates', () => {
    expect(isoDateSchema.safeParse('2026-02-29').success).toBe(false)
    expect(isoDateSchema.safeParse('2028-02-29').success).toBe(true)
    expect(isoDateSchema.safeParse('13/11/2026').success).toBe(false)
  })
})

describe('schemas', () => {
  it('accepts only non-negative safe integer money', () => {
    for (const ok of [0, 1, Number.MAX_SAFE_INTEGER]) expect(minorSchema.safeParse(ok).success).toBe(true)
    for (const bad of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '100', Number.NaN]) expect(minorSchema.safeParse(bad).success).toBe(false)
  })

  it('defaults a new event and requires an occasion unless it is a draft', () => {
    const parsed = eventCreateSchema.parse({ occasion: 'birthday', eventName: 'Party', budgetMinor: 3_000_000 })
    expect(parsed).toMatchObject({ status: 'planning', currency: 'INR', venuePreference: 'flexible', eventDate: null, guestCount: null })
    expect(eventCreateSchema.safeParse({ occasion: null, eventName: 'X', budgetMinor: 1, status: 'planning' }).success).toBe(false)
    expect(eventCreateSchema.parse({ occasion: null, eventName: 'X', budgetMinor: 1 }).status).toBe('draft')
  })

  it('rejects unknown fields so clients cannot set ownership', () => {
    expect(eventUpdateSchema.safeParse({ userId: 'someone-else' }).success).toBe(false)
    expect(eventCreateSchema.safeParse({ eventName: 'X', budgetMinor: 1, user_id: 'x' }).success).toBe(false)
  })

  it('validates guest counts, task titles and duplicate budget categories', () => {
    expect(eventCreateSchema.safeParse({ eventName: 'X', budgetMinor: 1, guestCount: 0 }).success).toBe(false)
    expect(taskCreateSchema.safeParse({ title: 'x' }).success).toBe(false)
    expect(budgetUpdateSchema.safeParse({ expenses: [row('food', 1), row('food', 2)] }).success).toBe(false)
  })

  it('rejects unknown time zones', () => {
    expect(profileUpdateSchema.safeParse({ timeZone: 'Mars/Olympus' }).success).toBe(false)
    expect(profileUpdateSchema.safeParse({ timeZone: 'Asia/Kolkata' }).success).toBe(true)
  })
})
