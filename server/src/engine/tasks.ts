import { addDays, type CelebrationEvent, type Priority, type TaskKind } from '@celebrai/shared'
import type { Analysis } from './context.ts'

export interface PlannedTask {
  title: string
  priority: Priority
  kind: TaskKind
  dueDate: string | null
}

interface Template {
  title: string
  kind: TaskKind
  priority: Priority
  /** Ideal days before the event. */
  lead: number
  when?: (a: Analysis['flags']) => boolean
}

const TEMPLATES = (e: CelebrationEvent): Template[] => [
  { title: 'Finalise the guest list', kind: 'preparation', priority: 'high', lead: 28 },
  { title: 'Shortlist and book the venue', kind: 'vendor', priority: 'high', lead: 30 },
  { title: 'Book the caterer and fix the menu', kind: 'vendor', priority: 'high', lead: 21 },
  { title: `Confirm dietary options with the caterer: ${e.dietaryRequirements.join(', ')}`, kind: 'vendor', priority: 'high', lead: 14, when: (f) => f.dietary.length > 0 },
  { title: 'Book the decorator', kind: 'vendor', priority: 'medium', lead: 14 },
  { title: 'Book a photographer', kind: 'vendor', priority: 'medium', lead: 14, when: (f) => !f.lowBudget },
  { title: 'Ask a friend to take photos', kind: 'preparation', priority: 'low', lead: 7, when: (f) => f.lowBudget },
  { title: 'Book an age-appropriate entertainer', kind: 'vendor', priority: 'medium', lead: 14, when: (f) => f.children },
  { title: 'Book entertainment', kind: 'vendor', priority: 'medium', lead: 14, when: (f) => !f.children && !f.lowBudget },
  { title: 'Arrange a weather backup (tent or indoor space)', kind: 'vendor', priority: 'high', lead: 10, when: (f) => f.outdoor },
  { title: 'Send invitations', kind: 'invitation', priority: 'high', lead: 21 },
  { title: 'Collect RSVPs and confirm the headcount', kind: 'invitation', priority: 'medium', lead: 7 },
  { title: 'Buy supplies, favours and return gifts', kind: 'shopping', priority: 'medium', lead: 5 },
  { title: 'Reconfirm every vendor’s time and address', kind: 'vendor', priority: 'high', lead: 2 },
  { title: 'Prepare the event-day run sheet', kind: 'preparation', priority: 'low', lead: 1 },
]

/**
 * Builds the checklist with realistic deadlines: due dates are never before today or after
 * the event. Tasks whose ideal lead time no longer fits are due today and marked high priority.
 * Without an event date, tasks are left undated rather than invented.
 */
export function planTasks(event: CelebrationEvent, analysis: Analysis, today: string): PlannedTask[] {
  const { flags, daysUntil } = analysis
  return TEMPLATES(event)
    .filter((t) => !t.when || t.when(flags))
    .map((t) => {
      if (!event.eventDate || daysUntil === null) return { title: t.title, kind: t.kind, priority: t.priority, dueDate: null }
      const lead = flags.wedding ? Math.min(t.lead * 3, 180) : t.lead
      const compressed = lead > daysUntil
      return {
        title: t.title,
        kind: t.kind,
        priority: compressed && t.kind !== 'preparation' ? 'high' : t.priority,
        dueDate: compressed ? today : addDays(event.eventDate, -lead),
      }
    })
}
