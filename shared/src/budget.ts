import type { BudgetCategory, Minor } from './schemas.ts'

export interface BudgetLine {
  category: BudgetCategory
  estimatedMinor: Minor
  actualMinor: Minor | null
}

export interface BudgetSummary {
  budgetMinor: Minor
  estimatedMinor: Minor
  actualMinor: Minor
  remainingMinor: Minor
  overrunMinor: Minor
  warnings: string[]
}

/**
 * Source of truth for budget arithmetic. Integer minor units only, so totals are exact.
 * Reports overruns; never adjusts the user's budget or allocations.
 */
export function summarizeBudget(budgetMinor: Minor, lines: readonly BudgetLine[]): BudgetSummary {
  const estimatedMinor = lines.reduce((sum, l) => sum + l.estimatedMinor, 0)
  const actualMinor = lines.reduce((sum, l) => sum + (l.actualMinor ?? 0), 0)
  const diff = budgetMinor - estimatedMinor
  const warnings: string[] = []
  if (diff < 0) warnings.push(`Planned allocations exceed the total budget by ${-diff} minor units.`)
  for (const l of lines) {
    if (l.actualMinor !== null && l.actualMinor > l.estimatedMinor) warnings.push(`${l.category} spending is above its estimate.`)
  }
  if (lines.length > 0 && !lines.some((l) => l.category === 'contingency' && l.estimatedMinor > 0)) {
    warnings.push('No contingency set aside. Around 10% protects against last-minute costs.')
  }
  return { budgetMinor, estimatedMinor, actualMinor, remainingMinor: Math.max(diff, 0), overrunMinor: Math.max(-diff, 0), warnings }
}
