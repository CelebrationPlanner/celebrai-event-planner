import { addDays, BUDGET_CATEGORIES, type CelebrationEvent } from '@celebrai/shared'
import { describe, expect, it } from 'vitest'
import { allocateBudget } from './budget.ts'
import { analyzeEvent, missingDetails } from './context.ts'
import { planTasks } from './tasks.ts'

const TODAY = '2026-11-01'

function makeEvent(overrides: Partial<CelebrationEvent> = {}): CelebrationEvent {
  return {
    id: 'e1',
    status: 'planning',
    occasion: 'birthday',
    eventName: 'Party',
    eventDate: addDays(TODAY, 30),
    location: 'Pune',
    guestCount: 40,
    budgetMinor: 2_500_000,
    currency: 'INR',
    venuePreference: 'indoor',
    themePreferences: [],
    ageGroup: '',
    dietaryRequirements: [],
    additionalInstructions: '',
    invitationText: '',
    invitationTone: 'friendly',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

const total = (lines: { amountMinor: number }[]) => lines.reduce((s, l) => s + l.amountMinor, 0)
const amount = (lines: { category: string; amountMinor: number }[], c: string) => lines.find((l) => l.category === c)!.amountMinor
const rules = (e: CelebrationEvent) => analyzeEvent(e, TODAY).decisions.map((d) => d.rule)

describe('Scenario 1 — birthday, 50 guests, ₹30,000, outdoor, 10 days away', () => {
  const event = makeEvent({ guestCount: 50, budgetMinor: 3_000_000, venuePreference: 'outdoor', eventDate: addDays(TODAY, 10) })
  const analysis = analyzeEvent(event, TODAY)

  it('allocates exactly the budget, with a larger contingency for the outdoor setting', () => {
    const lines = allocateBudget(event.budgetMinor, analysis.flags)
    expect(lines.map((l) => l.category)).toEqual([...BUDGET_CATEGORIES])
    expect(total(lines)).toBe(3_000_000)
    expect(amount(lines, 'contingency')).toBeGreaterThan(300_000) // default 10% + outdoor/short-notice buffer
    expect(analysis.flags.lowBudget).toBe(false)
  })

  it('adds a weather backup and prioritises tasks for the short lead time', () => {
    expect(rules(event)).toEqual(expect.arrayContaining(['Outdoor venue', 'Short notice']))
    const tasks = planTasks(event, analysis, TODAY)
    expect(tasks.some((t) => /weather backup/i.test(t.title))).toBe(true)
    expect(tasks.filter((t) => t.priority === 'high').length).toBeGreaterThanOrEqual(4)
  })
})

describe('Scenario 2 — wedding, 200 guests, ₹5,00,000, 90 days away', () => {
  const event = makeEvent({ occasion: 'wedding', guestCount: 200, budgetMinor: 50_000_000, eventDate: addDays(TODAY, 90) })
  const analysis = analyzeEvent(event, TODAY)

  it('treats it as a large event and shifts budget toward catering and venue', () => {
    expect(analysis.flags.largeGuests).toBe(true)
    expect(analysis.flags.lowBudget).toBe(false)
    const lines = allocateBudget(event.budgetMinor, analysis.flags)
    expect(total(lines)).toBe(50_000_000)
    expect(amount(lines, 'food')).toBeGreaterThan(50_000_000 * 0.3)
  })

  it('flags capacity as something to verify, never as confirmed', () => {
    expect(analysis.risks.some((r) => /capacity/i.test(r.issue))).toBe(true)
    expect(analysis.assumptions.join(' ')).toMatch(/availability.*not verified/i)
  })

  it('uses longer wedding lead times', () => {
    const invites = planTasks(event, analysis, TODAY).find((t) => t.title === 'Send invitations')!
    expect(invites.dueDate! < addDays(event.eventDate!, -40)).toBe(true)
  })
})

describe('Scenario 3 — anniversary, 20 guests, ₹15,000, indoor', () => {
  it('applies no special-case rules and keeps the default split', () => {
    const event = makeEvent({ occasion: 'anniversary', guestCount: 20, budgetMinor: 1_500_000 })
    expect(rules(event)).toEqual([])
    expect(allocateBudget(event.budgetMinor, analyzeEvent(event, TODAY).flags).map((l) => l.amountMinor)).toEqual([
      300_000, 450_000, 225_000, 150_000, 150_000, 45_000, 30_000, 150_000,
    ])
  })
})

describe('Scenario 4 — birthday, 30 guests, ₹5,000 (very limited budget)', () => {
  const event = makeEvent({ guestCount: 30, budgetMinor: 500_000 })
  const analysis = analyzeEvent(event, TODAY)

  it('detects the tight per-guest budget and explains the trade-off', () => {
    expect(analysis.flags.lowBudget).toBe(true)
    expect(analysis.decisions.find((d) => d.rule === 'Tight budget')!.detail).toMatch(/₹167 per guest/)
  })

  it('cuts optional categories in favour of food, still summing exactly', () => {
    const lines = allocateBudget(event.budgetMinor, analysis.flags)
    expect(total(lines)).toBe(500_000)
    expect(amount(lines, 'photography')).toBeLessThan(500_000 * 0.1)
    expect(amount(lines, 'food')).toBeGreaterThan(500_000 * 0.3)
    expect(lines.find((l) => l.category === 'photography')!.reasoning).toMatch(/tight budget/i)
  })

  it('replaces paid photography with a low-cost alternative', () => {
    const titles = planTasks(event, analysis, TODAY).map((t) => t.title)
    expect(titles).not.toContain('Book a photographer')
    expect(titles.some((t) => /friend.*photos/i.test(t))).toBe(true)
  })
})

describe('Scenario 5 — outdoor celebration', () => {
  it('adds a weather risk with an indoor contingency', () => {
    const analysis = analyzeEvent(makeEvent({ venuePreference: 'outdoor' }), TODAY)
    expect(analysis.risks.some((r) => /weather/i.test(r.issue) && /indoor|tent/i.test(r.mitigation))).toBe(true)
  })
})

describe('Scenario 6 — event in three days', () => {
  const event = makeEvent({ eventDate: addDays(TODAY, 3) })
  const analysis = analyzeEvent(event, TODAY)
  const tasks = planTasks(event, analysis, TODAY)

  it('marks the plan urgent', () => {
    expect(analysis.flags.urgent).toBe(true)
    expect(rules(event)).toContain('Urgent timeline')
  })

  it('never produces a deadline in the past or after the event', () => {
    for (const t of tasks) {
      expect(t.dueDate! >= TODAY, t.title).toBe(true)
      expect(t.dueDate! <= event.eventDate!, t.title).toBe(true)
    }
  })

  it('makes compressed bookings high priority', () => {
    expect(tasks.filter((t) => t.kind === 'vendor').every((t) => t.priority === 'high')).toBe(true)
  })
})

describe('Scenario 7 — missing date and guest count', () => {
  it('asks exactly for the missing critical details and nothing already known', () => {
    const missing = missingDetails(makeEvent({ eventDate: null, guestCount: null }))
    expect(missing.map((m) => m.field)).toEqual(['eventDate', 'guestCount'])
    expect(missing[0].question).toMatch(/date/i)
  })

  it('creates undated tasks rather than inventing a schedule', () => {
    const event = makeEvent({ eventDate: null })
    expect(planTasks(event, analyzeEvent(event, TODAY), TODAY).every((t) => t.dueDate === null)).toBe(true)
  })
})

describe('other decision rules', () => {
  it('detects a children’s party from the event name and adds safety guidance', () => {
    const event = makeEvent({ eventName: "Anaya's 5th Birthday" })
    expect(rules(event)).toContain('Children attending')
    expect(analyzeEvent(event, TODAY).risks.some((r) => /supervis/i.test(r.mitigation))).toBe(true)
  })

  it('carries dietary requirements into a catering task', () => {
    const event = makeEvent({ dietaryRequirements: ['Vegan', 'Jain'] })
    expect(planTasks(event, analyzeEvent(event, TODAY), TODAY).some((t) => /Vegan, Jain/.test(t.title))).toBe(true)
  })
})

describe('allocateBudget (Scenario 9 guard: allocations can never exceed the budget)', () => {
  it('always sums exactly to the budget, for awkward amounts and every rule combination', () => {
    const budgets = [0, 1, 7, 99, 101, 333_333, 1_000_003, 9_999_999_999, Number.MAX_SAFE_INTEGER]
    const combos = [{}, { lowBudget: true }, { lowBudget: true, largeGuests: true, outdoor: true, children: true, shortNotice: true }]
    for (const b of budgets) {
      for (const flags of combos) {
        const lines = allocateBudget(b, { lowBudget: false, largeGuests: false, outdoor: false, children: false, shortNotice: false, ...flags })
        expect(lines.every((l) => Number.isSafeInteger(l.amountMinor) && l.amountMinor >= 0)).toBe(true)
        expect(lines.reduce((s, l) => BigInt(l.amountMinor) + s, 0n)).toBe(BigInt(b))
      }
    }
  })
})
