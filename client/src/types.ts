// Domain types come from @celebrai/shared (the same Zod-backed definitions the API uses).
// This file adds only UI labels for the shared enumerations.
import type { BudgetCategory, Occasion } from '@celebrai/shared'

export type {
  BudgetCategory,
  CelebrationEvent,
  ChatMessage,
  CurrencyCode,
  EventPlan,
  Expense,
  InvitationTone,
  Minor,
  Occasion,
  Priority,
  Profile,
  Task,
  TaskKind,
} from '@celebrai/shared'
export { CURRENCIES, INVITATION_TONES } from '@celebrai/shared'

export const OCCASIONS = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'baby_shower', label: 'Baby shower' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'corporate', label: 'Corporate event' },
  { value: 'family', label: 'Family celebration' },
  { value: 'festival', label: 'Festival / special occasion' },
] as const satisfies ReadonlyArray<{ value: Occasion; label: string }>

export const BUDGET_CATEGORIES = [
  { value: 'venue', label: 'Venue' },
  { value: 'food', label: 'Food & catering' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'photography', label: 'Photography' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'invitations', label: 'Invitations' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
  { value: 'contingency', label: 'Contingency' },
] as const satisfies ReadonlyArray<{ value: BudgetCategory; label: string }>

export const occasionLabel = (value: string | null) => OCCASIONS.find((o) => o.value === value)?.label ?? null
export const categoryLabel = (value: string) => BUDGET_CATEGORIES.find((c) => c.value === value)?.label ?? value
