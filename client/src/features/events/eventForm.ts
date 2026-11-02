// ponytail: wizard validation lives here until shared/ exists (Phase 3), then the server's
// EventContext schema becomes the single source of truth.
import { z } from 'zod'
import { parseMoney } from '@/lib/money'
import { CURRENCIES, OCCASIONS } from '@/types'

export const AGE_GROUPS = ['Children (under 12)', 'Teens', 'Adults', 'Mixed ages', 'Seniors'] as const
export const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Jain', 'Gluten-free', 'Nut allergy', 'Halal'] as const

export interface EventFormValues {
  occasion: string
  eventName: string
  eventDate: string
  location: string
  guestCount: string
  budget: string
  currency: string
  venuePreference: string
  themePreferences: string
  ageGroup: string
  dietaryRequirements: string[]
  additionalInstructions: string
}

export const emptyEventForm = (occasion = ''): EventFormValues => ({
  occasion,
  eventName: '',
  eventDate: '',
  location: '',
  guestCount: '',
  budget: '',
  currency: 'INR',
  venuePreference: 'flexible',
  themePreferences: '',
  ageGroup: '',
  dietaryRequirements: [],
  additionalInstructions: '',
})

const occasionValues = OCCASIONS.map((o) => o.value) as [string, ...string[]]

export function stepSchemas(today: string) {
  return [
    z.object({
      occasion: z.enum(occasionValues, 'Choose an occasion.'),
      eventName: z.string().trim().min(2, 'Give your event a name.').max(120, 'Keep the name under 120 characters.'),
      eventDate: z.string().refine((d) => d === '' || d >= today, 'The date can’t be in the past.'),
      location: z.string().trim().max(120, 'Keep the location under 120 characters.'),
    }),
    z.object({
      guestCount: z
        .string()
        .regex(/^\d+$/, 'Enter the number of guests.')
        .refine((v) => Number(v) >= 1 && Number(v) <= 5000, 'Guests must be between 1 and 5,000.'),
      budget: z
        .string()
        .refine((v) => (parseMoney(v) ?? 0) > 0, 'Enter a budget greater than zero (up to 2 decimals).'),
      currency: z.enum(CURRENCIES),
      venuePreference: z.enum(['indoor', 'outdoor', 'flexible']),
    }),
    z.object({
      themePreferences: z.string().max(200, 'Keep theme preferences under 200 characters.'),
      ageGroup: z.string(),
      additionalInstructions: z.string().max(1000, 'Keep instructions under 1,000 characters.'),
    }),
  ] as const
}

export type FormErrors = Partial<Record<keyof EventFormValues, string>>

export function validateStep(step: number, values: EventFormValues, today: string): FormErrors {
  const result = stepSchemas(today)[step].safeParse(values)
  const errors: FormErrors = {}
  if (!result.success)
    for (const issue of result.error.issues) errors[issue.path[0] as keyof EventFormValues] ??= issue.message
  return errors
}
