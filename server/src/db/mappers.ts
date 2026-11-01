// snake_case database rows → camelCase API objects. Enum columns are guaranteed by
// CHECK constraints in the migration, so narrowing their types here is safe.
import type { BudgetCategory, CelebrationEvent, CurrencyCode, EventStatus, Expense, InvitationTone, Occasion, Priority, Profile, Task, TaskKind } from '@celebrai/shared'
import type { Database } from './database.types.ts'

type Row<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export const toEvent = (r: Row<'events'>): CelebrationEvent => ({
  id: r.id,
  status: r.status as EventStatus,
  occasion: r.occasion as Occasion | null,
  eventName: r.event_name,
  eventDate: r.event_date,
  location: r.location,
  guestCount: r.guest_count,
  budgetMinor: r.budget_minor,
  currency: r.currency as CurrencyCode,
  venuePreference: r.venue_preference as CelebrationEvent['venuePreference'],
  themePreferences: r.theme_preferences,
  ageGroup: r.age_group,
  dietaryRequirements: r.dietary_requirements,
  additionalInstructions: r.additional_instructions,
  invitationText: r.invitation_text,
  invitationTone: r.invitation_tone as InvitationTone,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const toTask = (r: Row<'tasks'>): Task => ({
  id: r.id,
  eventId: r.event_id,
  title: r.title,
  priority: r.priority as Priority,
  dueDate: r.due_date,
  kind: r.kind as TaskKind,
  completed: r.completed,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const toExpense = (r: Row<'expenses'>): Expense => ({
  id: r.id,
  eventId: r.event_id,
  category: r.category as BudgetCategory,
  estimatedMinor: r.estimated_minor,
  actualMinor: r.actual_minor,
})

export const toProfile = (r: Row<'profiles'>): Profile => ({
  id: r.id,
  displayName: r.display_name,
  timeZone: r.time_zone,
  defaultCurrency: r.default_currency as CurrencyCode,
})
