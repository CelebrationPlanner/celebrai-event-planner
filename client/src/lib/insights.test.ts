import { describe, expect, it } from 'vitest'
import { createDemoState } from '@/demo/demoData'
import type { Expense } from '@/types'
import { missingFields, sortTasks, summarizeBudget, taskProgress } from './insights'

const { events, expenses, tasks } = createDemoState('2026-11-01')
const birthday = events[0]
const rows = (pairs: Array<[number, number | null]>): Expense[] =>
  pairs.map(([estimatedMinor, actualMinor], i) => ({ id: String(i), eventId: 'e', category: 'food', estimatedMinor, actualMinor }))

describe('summarizeBudget', () => {
  it('balances when allocations equal the budget', () => {
    const s = summarizeBudget(birthday.budgetMinor, expenses.filter((x) => x.eventId === birthday.id))
    expect(s.estimatedMinor).toBe(2_500_000)
    expect(s.remainingMinor).toBe(0)
    expect(s.overrunMinor).toBe(0)
  })

  it('reports the exact overrun (₹20,000 budget, ₹24,000 allocated → ₹4,000)', () => {
    const s = summarizeBudget(2_000_000, rows([[1_500_000, null], [900_000, null]]))
    expect(s.overrunMinor).toBe(400_000)
    expect(s.remainingMinor).toBe(0)
    expect(s.warnings[0]).toMatch(/exceed/i)
  })

  it('flags categories whose actual spend is above estimate', () => {
    const s = summarizeBudget(1_000_000, rows([[100_000, 150_000]]))
    expect(s.actualMinor).toBe(150_000)
    expect(s.warnings.some((w) => /above its estimate/.test(w))).toBe(true)
  })
})

describe('missingFields', () => {
  it('lists critical details that are absent', () => {
    expect(missingFields(birthday)).toEqual([])
    expect(missingFields({ ...birthday, eventDate: null, guestCount: null })).toEqual(['Event date', 'Guest count'])
  })
})

describe('tasks', () => {
  it('computes completion progress and sorts open tasks by due date then priority', () => {
    const own = tasks.filter((t) => t.eventId === birthday.id)
    expect(taskProgress(own)).toEqual({ done: 1, total: 8, percent: 13 })
    const sorted = sortTasks(own)
    expect(sorted.at(-1)?.completed).toBe(true)
    expect(sorted[0].title).toBe('Book magician or game host')
  })
})
