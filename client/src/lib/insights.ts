// ponytail: display-side derivations for the demo. The backend becomes the source of truth
// for budget totals and missing-field detection in Phases 3–4 (shared/ + server engine).
import { BUDGET_CATEGORIES, type CelebrationEvent, type Expense, type Minor, type Task } from '@/types'

export interface BudgetSummary {
  budgetMinor: Minor
  estimatedMinor: Minor
  actualMinor: Minor
  remainingMinor: Minor
  overrunMinor: Minor
  warnings: string[]
}

const categoryLabel = (value: string) => BUDGET_CATEGORIES.find((c) => c.value === value)?.label ?? value

export function summarizeBudget(budgetMinor: Minor, expenses: Expense[]): BudgetSummary {
  const estimatedMinor = expenses.reduce((sum, x) => sum + x.estimatedMinor, 0)
  const actualMinor = expenses.reduce((sum, x) => sum + (x.actualMinor ?? 0), 0)
  const diff = budgetMinor - estimatedMinor
  const warnings: string[] = []
  if (diff < 0) warnings.push('Planned allocations exceed the total budget. Reduce a category or increase the budget.')
  for (const x of expenses) {
    if (x.actualMinor !== null && x.actualMinor > x.estimatedMinor) warnings.push(`${categoryLabel(x.category)} spending is above its estimate.`)
  }
  if (expenses.length > 0 && !expenses.some((x) => x.category === 'contingency' && x.estimatedMinor > 0)) {
    warnings.push('No contingency set aside. Around 10% protects against last-minute costs.')
  }
  return { budgetMinor, estimatedMinor, actualMinor, remainingMinor: Math.max(diff, 0), overrunMinor: Math.max(-diff, 0), warnings }
}

export function missingFields(event: CelebrationEvent): string[] {
  const missing: string[] = []
  if (!event.occasion) missing.push('Occasion')
  if (!event.eventDate) missing.push('Event date')
  if (!event.guestCount) missing.push('Guest count')
  if (!event.budgetMinor) missing.push('Budget')
  if (!event.location) missing.push('Location')
  return missing
}

export function taskProgress(tasks: Task[]) {
  const done = tasks.filter((t) => t.completed).length
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
}

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const

/** Open tasks first, then by due date (undated last), then by priority. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      Number(a.completed) - Number(b.completed) ||
      (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  )
}
