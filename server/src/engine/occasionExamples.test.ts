// The public occasion pages show stored engine output; this keeps them honest.
import { addDays, daysBetween, type CelebrationEvent } from '@celebrai/shared'
import { describe, expect, it } from 'vitest'
import { OCCASION_EXAMPLES } from '../../../client/src/features/occasions/examples.ts'
import { allocateBudget } from './budget.ts'
import { analyzeEvent } from './context.ts'
import { planTasks } from './tasks.ts'

const TODAY = '2026-11-01'

describe.each(Object.values(OCCASION_EXAMPLES))('occasion page example: $input.eventName', (example) => {
  const { daysUntil, ...details } = example.input
  const event: CelebrationEvent = {
    id: 'example',
    status: 'planning',
    currency: 'INR',
    eventDate: addDays(TODAY, daysUntil),
    themePreferences: [],
    additionalInstructions: '',
    invitationText: '',
    invitationTone: 'friendly',
    createdAt: '',
    updatedAt: '',
    ...details,
  }
  const analysis = analyzeEvent(event, TODAY)

  it('matches the engine', () => {
    expect({
      decisions: analysis.decisions,
      budget: allocateBudget(event.budgetMinor, analysis.flags),
      tasks: planTasks(event, analysis, TODAY).map((t) => ({
        title: t.title,
        priority: t.priority,
        daysBefore: daysBetween(t.dueDate!, event.eventDate!),
      })),
      risks: analysis.risks,
    }).toEqual({ decisions: example.decisions, budget: example.budget, tasks: example.tasks, risks: example.risks })
  })
})
