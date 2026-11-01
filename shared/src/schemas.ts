import { z } from 'zod'
import { isRealDate, isValidTimeZone } from './dates.ts'

export const OCCASIONS = ['birthday', 'wedding', 'anniversary', 'baby_shower', 'engagement', 'corporate', 'family', 'festival'] as const
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const
export const EVENT_STATUSES = ['draft', 'planning', 'ready', 'completed'] as const
export const VENUE_PREFERENCES = ['indoor', 'outdoor', 'flexible'] as const
export const PRIORITIES = ['high', 'medium', 'low'] as const
export const TASK_KINDS = ['preparation', 'vendor', 'invitation', 'shopping'] as const
export const INVITATION_TONES = ['formal', 'friendly', 'traditional', 'modern'] as const
export const BUDGET_CATEGORIES = ['venue', 'food', 'decoration', 'photography', 'entertainment', 'invitations', 'miscellaneous', 'contingency'] as const

export type Occasion = (typeof OCCASIONS)[number]
export type CurrencyCode = (typeof CURRENCIES)[number]
export type EventStatus = (typeof EVENT_STATUSES)[number]
export type Priority = (typeof PRIORITIES)[number]
export type TaskKind = (typeof TASK_KINDS)[number]
export type InvitationTone = (typeof INVITATION_TONES)[number]
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number]
/** Money is always an integer in minor units (paise / cents). */
export type Minor = number

export const minorSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
export const isoDateSchema = z.string().refine(isRealDate, 'Use a real date in YYYY-MM-DD format.')
const text = (max: number) => z.string().trim().max(max)
const tags = z.array(z.string().trim().min(1).max(40)).max(10)

const eventContextShape = {
  occasion: z.enum(OCCASIONS).nullable(),
  eventName: z.string().trim().min(1).max(120),
  eventDate: isoDateSchema.nullable(),
  location: text(120),
  guestCount: z.number().int().min(1).max(5000).nullable(),
  budgetMinor: minorSchema,
  currency: z.enum(CURRENCIES),
  venuePreference: z.enum(VENUE_PREFERENCES),
  themePreferences: tags,
  ageGroup: text(40),
  dietaryRequirements: tags,
  additionalInstructions: text(1000),
}

const occasionRequired = (e: { status?: EventStatus; occasion?: Occasion | null }) => e.status === undefined || e.status === 'draft' || !!e.occasion
const occasionMessage = { message: 'An occasion is required unless the event is a draft.', path: ['occasion'] }

export const eventCreateSchema = z
  .strictObject({
    ...eventContextShape,
    occasion: eventContextShape.occasion.default(null),
    eventDate: eventContextShape.eventDate.default(null),
    location: eventContextShape.location.default(''),
    guestCount: eventContextShape.guestCount.default(null),
    currency: eventContextShape.currency.default('INR'),
    venuePreference: eventContextShape.venuePreference.default('flexible'),
    themePreferences: tags.default([]),
    ageGroup: eventContextShape.ageGroup.default(''),
    dietaryRequirements: tags.default([]),
    additionalInstructions: eventContextShape.additionalInstructions.default(''),
    status: z.enum(['draft', 'planning']).optional(),
  })
  .refine(occasionRequired, occasionMessage)
  .transform((e) => ({ ...e, status: e.status ?? (e.occasion ? 'planning' : 'draft') }) as const)

export const eventUpdateSchema = z.strictObject({ ...eventContextShape, status: z.enum(EVENT_STATUSES) }).partial()

export const taskCreateSchema = z.strictObject({
  title: z.string().trim().min(2).max(200),
  priority: z.enum(PRIORITIES).default('medium'),
  dueDate: isoDateSchema.nullable().default(null),
  kind: z.enum(TASK_KINDS).default('preparation'),
})
export const taskUpdateSchema = z
  .strictObject({ title: z.string().trim().min(2).max(200), priority: z.enum(PRIORITIES), dueDate: isoDateSchema.nullable(), kind: z.enum(TASK_KINDS), completed: z.boolean() })
  .partial()

export const budgetUpdateSchema = z.strictObject({
  expenses: z
    .array(z.strictObject({ category: z.enum(BUDGET_CATEGORIES), estimatedMinor: minorSchema, actualMinor: minorSchema.nullable() }))
    .min(1)
    .max(BUDGET_CATEGORIES.length)
    .refine((rows) => new Set(rows.map((r) => r.category)).size === rows.length, 'Each category can appear only once.'),
})

export const invitationSchema = z.strictObject({ text: text(2000), tone: z.enum(INVITATION_TONES) })

export const profileUpdateSchema = z
  .strictObject({
    displayName: z.string().trim().min(1).max(80),
    timeZone: z.string().refine(isValidTimeZone, 'Unknown time zone.'),
    defaultCurrency: z.enum(CURRENCIES),
  })
  .partial()

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export type EventCreate = z.infer<typeof eventCreateSchema>
export type EventUpdate = z.infer<typeof eventUpdateSchema>
export type TaskCreate = z.infer<typeof taskCreateSchema>
export type TaskUpdate = z.infer<typeof taskUpdateSchema>
export type BudgetUpdate = z.infer<typeof budgetUpdateSchema>

export interface CelebrationEvent extends Omit<EventCreate, 'status'> {
  id: string
  status: EventStatus
  invitationText: string
  invitationTone: InvitationTone
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  eventId: string
  title: string
  priority: Priority
  dueDate: string | null
  kind: TaskKind
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface Expense {
  id: string
  eventId: string
  category: BudgetCategory
  estimatedMinor: Minor
  actualMinor: Minor | null
}

export interface Profile {
  id: string
  displayName: string
  timeZone: string
  defaultCurrency: CurrencyCode
}

export interface ApiErrorBody {
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'PAYLOAD_TOO_LARGE' | 'RATE_LIMITED' | 'AI_UNAVAILABLE' | 'AI_TIMEOUT' | 'AI_INVALID_OUTPUT' | 'INTERNAL'
    message: string
    details?: unknown
  }
}
