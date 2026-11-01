// ponytail: client-side copies of the domain types; they move to shared/ (Zod-backed) in Phase 3.

export const OCCASIONS = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'baby_shower', label: 'Baby shower' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'corporate', label: 'Corporate event' },
  { value: 'family', label: 'Family celebration' },
  { value: 'festival', label: 'Festival / special occasion' },
] as const
export type Occasion = (typeof OCCASIONS)[number]['value']

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const
export type CurrencyCode = (typeof CURRENCIES)[number]

export type VenuePreference = 'indoor' | 'outdoor' | 'flexible'
export type EventStatus = 'draft' | 'planning' | 'ready' | 'completed'
export type Priority = 'high' | 'medium' | 'low'
export type TaskKind = 'preparation' | 'vendor' | 'invitation' | 'shopping'

export const INVITATION_TONES = ['formal', 'friendly', 'traditional', 'modern'] as const
export type InvitationTone = (typeof INVITATION_TONES)[number]

export const BUDGET_CATEGORIES = [
  { value: 'venue', label: 'Venue' },
  { value: 'food', label: 'Food & catering' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'photography', label: 'Photography' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'invitations', label: 'Invitations' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
  { value: 'contingency', label: 'Contingency' },
] as const
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]['value']

/** Money is always an integer in minor units (paise / cents). */
export type Minor = number

export interface CelebrationEvent {
  id: string
  status: EventStatus
  occasion: Occasion | null
  eventName: string
  /** ISO date (YYYY-MM-DD) or null when the user hasn't decided yet. */
  eventDate: string | null
  location: string
  guestCount: number | null
  budgetMinor: Minor
  currency: CurrencyCode
  venuePreference: VenuePreference
  themePreferences: string[]
  ageGroup: string
  dietaryRequirements: string[]
  additionalInstructions: string
  invitationText: string
  invitationTone: InvitationTone
  createdAt: string
}

export interface Task {
  id: string
  eventId: string
  title: string
  priority: Priority
  dueDate: string | null
  completed: boolean
  kind: TaskKind
}

export interface Expense {
  id: string
  eventId: string
  category: BudgetCategory
  estimatedMinor: Minor
  actualMinor: Minor | null
}

export interface Recommendation {
  category: string
  recommendation: string
  explanation: string
  reasoning: string
  estimatedCostMinor: Minor | null
  assumptions: string[]
}

export interface EventPlan {
  eventId: string
  version: number
  summary: string
  theme: { name: string; description: string; reasoning: string }
  recommendations: Recommendation[]
  schedule: Array<{ time: string; activity: string }>
  risks: Array<{ issue: string; mitigation: string }>
  assumptions: string[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  eventId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface Activity {
  id: string
  eventId: string | null
  message: string
  at: string
}
