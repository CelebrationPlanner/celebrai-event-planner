import { addDays, eventPlanSchema, type CelebrationEvent, type EventPlan } from '@celebrai/shared'
import type { AiPlan } from '../ai/schemas.ts'
import type { BudgetLine } from './budget.ts'
import type { Analysis } from './context.ts'
import type { PlannedTask } from './tasks.ts'

const dedupe = <T>(items: T[], key: (t: T) => string) => {
  const seen = new Set<string>()
  return items.filter((t) => !seen.has(key(t)) && seen.add(key(t)))
}

/**
 * Combines the model's words with the engine's numbers into the stored EventPlan.
 * Costs come from the allocation, dates from the engine, and the result is validated
 * against the shared schema before it can be saved.
 */
export function buildPlan(input: { ai: AiPlan; event: CelebrationEvent; analysis: Analysis; budget: BudgetLine[]; tasks: PlannedTask[]; today: string; contextHash: string }): EventPlan {
  const { ai, event, analysis, budget, tasks, today } = input
  const allocation = new Map(budget.map((b) => [b.category, b.amountMinor]))
  const costed = new Set<string>()

  const recommendations = ai.recommendations.map((r) => {
    const first = r.budgetCategory !== null && !costed.has(r.budgetCategory)
    if (first) costed.add(r.budgetCategory!)
    return {
      category: r.category,
      recommendation: r.recommendation,
      explanation: r.explanation,
      reasoning: r.reasoning,
      estimatedCostMinor: first ? allocation.get(r.budgetCategory!)! : null,
      assumptions: r.assumptions,
    }
  })

  const extraTasks: PlannedTask[] = ai.extraTasks.map((t) => {
    const ideal = event.eventDate ? addDays(event.eventDate, -t.daysBeforeEvent) : null
    return { title: t.title, priority: t.priority, kind: t.kind, dueDate: ideal && ideal < today ? today : ideal }
  })

  return eventPlanSchema.parse({
    summary: ai.summary,
    theme: ai.theme,
    recommendations,
    budget,
    checklist: dedupe([...tasks, ...extraTasks], (t) => t.title.toLowerCase()).slice(0, 30),
    schedule: [...ai.schedule].sort((a, b) => a.time.localeCompare(b.time)),
    risks: dedupe([...analysis.risks, ...ai.risks], (r) => r.issue.toLowerCase()).slice(0, 16),
    assumptions: dedupe([...analysis.assumptions, ...ai.assumptions], (a) => a.toLowerCase()).slice(0, 16),
    decisions: analysis.decisions,
    contextHash: input.contextHash,
    generatedAt: new Date().toISOString(),
  })
}
