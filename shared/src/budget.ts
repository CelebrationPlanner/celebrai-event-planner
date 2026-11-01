import type { BudgetCategory, Minor } from './schemas.ts'

export interface BudgetLine {
  category: BudgetCategory
  estimatedMinor: Minor
  actualMinor: Minor | null
}

/** Machine-readable so each client can word (and translate) warnings itself. */
export type BudgetWarning = { kind: 'overrun'; amountMinor: Minor } | { kind: 'over_estimate'; category: BudgetCategory } | { kind: 'no_contingency' }

export interface BudgetSummary {
  budgetMinor: Minor
  estimatedMinor: Minor
  actualMinor: Minor
  remainingMinor: Minor
  overrunMinor: Minor
  warnings: BudgetWarning[]
}

/**
 * Source of truth for budget arithmetic. Integer minor units only, so totals are exact.
 * Reports overruns; never adjusts the user's budget or allocations.
 */
export function summarizeBudget(budgetMinor: Minor, lines: readonly BudgetLine[]): BudgetSummary {
  const estimatedMinor = lines.reduce((sum, l) => sum + l.estimatedMinor, 0)
  const actualMinor = lines.reduce((sum, l) => sum + (l.actualMinor ?? 0), 0)
  const diff = budgetMinor - estimatedMinor
  const warnings: BudgetWarning[] = []
  if (diff < 0) warnings.push({ kind: 'overrun', amountMinor: -diff })
  for (const l of lines) {
    if (l.actualMinor !== null && l.actualMinor > l.estimatedMinor) warnings.push({ kind: 'over_estimate', category: l.category })
  }
  if (lines.length > 0 && !lines.some((l) => l.category === 'contingency' && l.estimatedMinor > 0)) {
    warnings.push({ kind: 'no_contingency' })
  }
  return { budgetMinor, estimatedMinor, actualMinor, remainingMinor: Math.max(diff, 0), overrunMinor: Math.max(-diff, 0), warnings }
}
