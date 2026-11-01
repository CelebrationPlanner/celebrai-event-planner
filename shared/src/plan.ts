import { z } from 'zod'
import { BUDGET_CATEGORIES, INVITATION_TONES, isoDateSchema, minorSchema, PRIORITIES, TASK_KINDS } from './schemas.ts'

const line = (max: number) => z.string().trim().min(1).max(max)
export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM.')

/**
 * The stored, validated event plan (D2). Text comes from the AI; every number and date
 * (budget, costs, due dates) is filled in by the backend engine.
 */
export const eventPlanSchema = z.object({
  summary: line(800),
  theme: z.object({ name: line(80), description: line(400), reasoning: line(500) }),
  recommendations: z
    .array(
      z.object({
        category: line(40),
        recommendation: line(400),
        explanation: line(600),
        reasoning: line(600),
        estimatedCostMinor: minorSchema.nullable(),
        assumptions: z.array(line(200)).max(5),
      }),
    )
    .min(1)
    .max(12),
  budget: z.array(z.object({ category: z.enum(BUDGET_CATEGORIES), amountMinor: minorSchema, reasoning: line(400) })).length(BUDGET_CATEGORIES.length),
  checklist: z.array(z.object({ title: line(200), priority: z.enum(PRIORITIES), kind: z.enum(TASK_KINDS), dueDate: isoDateSchema.nullable() })).max(30),
  schedule: z.array(z.object({ time: timeOfDaySchema, activity: line(200) })).max(20),
  risks: z.array(z.object({ issue: line(300), mitigation: line(400) })).max(16),
  assumptions: z.array(line(300)).max(16),
  /** Deterministic rules the engine applied, shown to users as "how CelebrAI decided". */
  decisions: z.array(z.object({ rule: line(60), detail: line(400) })).max(12),
  contextHash: z.string().length(64),
  generatedAt: z.string(),
})
export type EventPlan = z.infer<typeof eventPlanSchema>

export const MAX_MESSAGE_LENGTH = 2000
export const MAX_HISTORY = 20

export const chatRequestSchema = z.strictObject({
  eventId: z.uuid().optional(),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
})
export const generatePlanSchema = z.strictObject({ eventId: z.uuid(), regenerate: z.boolean().default(false) })
export const invitationGenerateSchema = z.strictObject({ tone: z.enum(INVITATION_TONES) })

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  at: string
}
