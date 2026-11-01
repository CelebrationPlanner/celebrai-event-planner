// What the model is allowed to return. It supplies words and extracted facts; it never
// supplies money amounts or calendar dates for the plan — the engine does.
import { BUDGET_CATEGORIES, CURRENCIES, OCCASIONS, PRIORITIES, TASK_KINDS, timeOfDaySchema, VENUE_PREFERENCES } from '@celebrai/shared'
import { z } from 'zod'

/** Model text is trimmed to the limit rather than failing the whole response; it never carries numbers. */
const line = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((s) => s.slice(0, max))
    .describe(`At most ${max} characters.`)
const tags = z.array(z.string().trim().min(1).transform((s) => s.slice(0, 40))).transform((t) => t.slice(0, 10))

/** Chat turn: a short acknowledgement plus facts extracted from what the user said. */
export const aiChatSchema = z.object({
  reply: line(600),
  extracted: z.object({
    occasion: z.enum(OCCASIONS).nullable(),
    eventName: z.string().nullable(),
    eventDate: z.string().nullable().describe('YYYY-MM-DD, or null if not stated.'),
    location: z.string().nullable(),
    guestCount: z.number().nullable(),
    budgetAmount: z.number().nullable().describe('Whole currency units, e.g. 25000 for ₹25,000.'),
    currency: z.enum(CURRENCIES).nullable(),
    venuePreference: z.enum(VENUE_PREFERENCES).nullable(),
    themePreferences: tags,
    ageGroup: z.string().nullable(),
    dietaryRequirements: tags,
    additionalInstructions: z.string().nullable(),
  }),
})
export type AiChat = z.infer<typeof aiChatSchema>

export const aiPlanSchema = z.object({
  summary: line(800),
  theme: z.object({ name: line(80), description: line(400), reasoning: line(500) }),
  recommendations: z
    .array(
      z.object({
        category: line(40),
        budgetCategory: z.enum(BUDGET_CATEGORIES).nullable(),
        recommendation: line(400),
        explanation: line(600),
        reasoning: line(600),
        assumptions: z.array(line(200)).max(5),
      }),
    )
    .min(3)
    .max(10),
  schedule: z.array(z.object({ time: timeOfDaySchema.describe('24-hour HH:MM, e.g. 16:30.'), activity: line(200) })).min(3).max(16),
  risks: z.array(z.object({ issue: line(300), mitigation: line(400) })).max(8),
  assumptions: z.array(line(300)).max(8),
  extraTasks: z.array(z.object({ title: line(200), priority: z.enum(PRIORITIES), kind: z.enum(TASK_KINDS), daysBeforeEvent: z.number().int().min(0).max(365).describe('Whole days before the event.') })).max(6),
})
export type AiPlan = z.infer<typeof aiPlanSchema>

export const aiInvitationSchema = z.object({ text: z.string().trim().min(20).max(1500) })
