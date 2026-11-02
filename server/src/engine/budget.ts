import { BUDGET_CATEGORIES, type BudgetCategory, type Minor } from '@celebrai/shared'
import type { Flags } from './context.ts'

/** Starting split in basis points (spec §11). Sums to 10,000. */
const DEFAULT_SHARES: Record<BudgetCategory, number> = {
  venue: 2000,
  food: 3000,
  decoration: 1500,
  photography: 1000,
  entertainment: 1000,
  invitations: 300,
  miscellaneous: 200,
  contingency: 1000,
}

const BASE_REASON: Record<BudgetCategory, string> = {
  venue: 'Space for your guests.',
  food: 'Usually the largest cost: food and drinks for every guest.',
  decoration: 'Sets the theme and atmosphere.',
  photography: 'Captures the memories.',
  entertainment: 'Keeps guests engaged.',
  invitations: 'Printed or digital invitations.',
  miscellaneous: 'Small items: candles, cutlery, tips.',
  contingency: 'A buffer for last-minute costs. Leave it untouched until the final week.',
}

type Transfer = [from: BudgetCategory, to: BudgetCategory, bp: number, reason: string]

/** Rule-driven moves between categories. Each moves at most what the source still holds. */
const TRANSFERS: Array<[keyof Flags, Transfer[]]> = [
  [
    'lowBudget',
    [
      ['photography', 'food', 600, 'Reduced for a tight budget: a friend or phone photos instead.'],
      ['entertainment', 'food', 500, 'Reduced for a tight budget: DIY games instead of paid acts.'],
      ['decoration', 'venue', 300, 'Reduced for a tight budget: simple DIY décor.'],
      ['invitations', 'venue', 200, 'Reduced for a tight budget: digital invitations.'],
    ],
  ],
  [
    'largeGuests',
    [
      ['photography', 'food', 300, 'More guests need more catering.'],
      ['entertainment', 'venue', 300, 'More guests need a bigger space.'],
      ['decoration', 'food', 200, 'More guests need more catering.'],
    ],
  ],
  [
    'outdoor',
    [
      ['decoration', 'contingency', 250, 'Extra buffer for a tent or indoor backup.'],
      ['entertainment', 'contingency', 250, 'Extra buffer for a tent or indoor backup.'],
    ],
  ],
  ['children', [['photography', 'entertainment', 300, 'Children’s activities take priority.']]],
  ['shortNotice', [['decoration', 'contingency', 300, 'Buffer for rush and short-notice fees.']]],
]

export interface BudgetLine {
  category: BudgetCategory
  amountMinor: Minor
  reasoning: string
}

/**
 * Splits the budget into category allocations that always sum to exactly `budgetMinor`.
 * BigInt avoids overflow for large budgets; the few leftover minor units from rounding go
 * to the categories with the largest remainders (ties in fixed category order).
 */
export function allocateBudget(budgetMinor: Minor, flags: Flags): BudgetLine[] {
  const shares = { ...DEFAULT_SHARES }
  const notes: Record<BudgetCategory, string[]> = Object.fromEntries(BUDGET_CATEGORIES.map((c) => [c, []])) as never

  for (const [flag, transfers] of TRANSFERS) {
    if (!flags[flag]) continue
    for (const [from, to, bp, reason] of transfers) {
      const moved = Math.min(bp, shares[from])
      shares[from] -= moved
      shares[to] += moved
      if (!notes[from].includes(reason)) notes[from].push(reason)
      if (!notes[to].includes(reason)) notes[to].push(reason)
    }
  }

  const budget = BigInt(budgetMinor)
  const exact = BUDGET_CATEGORIES.map((c) => budget * BigInt(shares[c]))
  const amounts = exact.map((x) => x / 10_000n)
  let leftover = budget - amounts.reduce((a, b) => a + b, 0n)
  const byRemainder = exact
    .map((x, i) => [x % 10_000n, i] as const)
    .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] > b[0] ? -1 : 1))
  for (const [, i] of byRemainder) {
    if (leftover === 0n) break
    amounts[i] += 1n
    leftover -= 1n
  }

  return BUDGET_CATEGORIES.map((category, i) => ({
    category,
    amountMinor: Number(amounts[i]),
    reasoning: [BASE_REASON[category], ...notes[category]].join(' '),
  }))
}
