import { addDays, eventPlanSchema, type CelebrationEvent } from '@celebrai/shared'
import { describe, expect, it } from 'vitest'
import type { AiChat, AiPlan } from '../ai/schemas.ts'
import { allocateBudget } from './budget.ts'
import { analyzeEvent } from './context.ts'
import { applyExtraction, PLACEHOLDER_NAME } from './extraction.ts'
import { buildPlan } from './plan.ts'
import { planTasks } from './tasks.ts'

const TODAY = '2026-11-01'
const none: AiChat['extracted'] = {
  occasion: null,
  eventName: null,
  eventDate: null,
  location: null,
  guestCount: null,
  budgetAmount: null,
  currency: null,
  venuePreference: null,
  themePreferences: [],
  ageGroup: null,
  dietaryRequirements: [],
  additionalInstructions: null,
}

describe('applyExtraction (chat facts → validated event update)', () => {
  it('maps the brief’s example request onto event fields with integer money', () => {
    const { patch, notes } = applyExtraction(
      null,
      {
        ...none,
        occasion: 'birthday',
        eventName: "Daughter's 5th birthday",
        eventDate: addDays(TODAY, 12),
        location: 'Pune',
        guestCount: 40,
        budgetAmount: 25000,
        themePreferences: ['Princess'],
      },
      TODAY,
    )
    expect(notes).toEqual([])
    expect(patch).toEqual({
      occasion: 'birthday',
      eventName: "Daughter's 5th birthday",
      eventDate: addDays(TODAY, 12),
      location: 'Pune',
      guestCount: 40,
      budgetMinor: 2_500_000,
      themePreferences: ['Princess'],
    })
  })

  it('drops values the model got wrong instead of saving them', () => {
    const { patch, notes } = applyExtraction(
      null,
      {
        ...none,
        guestCount: 0,
        budgetAmount: -500,
        eventDate: addDays(TODAY, -3),
        location: 'x'.repeat(500),
      },
      TODAY,
    )
    expect(patch).toEqual({})
    expect(notes).toEqual(['That date has already passed. What date is the event?'])
  })

  it('ignores an injected budget that is not a real amount (e.g. NaN, fractions of a paisa, overflow)', () => {
    for (const budgetAmount of [Number.NaN, 10.005, 1e20])
      expect(applyExtraction(null, { ...none, budgetAmount }, TODAY).patch).toEqual({})
  })

  it('merges preference lists without duplicates and keeps a user-chosen name', () => {
    const existing = {
      eventName: 'Anaya turns 5',
      themePreferences: ['Princess'],
      dietaryRequirements: ['Vegetarian'],
    } as CelebrationEvent
    const { patch } = applyExtraction(
      existing,
      { ...none, eventName: 'Birthday', themePreferences: ['princess', 'Pastel'], dietaryRequirements: ['Jain'] },
      TODAY,
    )
    expect(patch).toEqual({ themePreferences: ['Princess', 'Pastel'], dietaryRequirements: ['Vegetarian', 'Jain'] })
  })

  it('renames a placeholder draft', () => {
    expect(
      applyExtraction(
        { eventName: PLACEHOLDER_NAME, themePreferences: [], dietaryRequirements: [] } as unknown as CelebrationEvent,
        { ...none, eventName: 'Diwali party' },
        TODAY,
      ).patch,
    ).toEqual({ eventName: 'Diwali party' })
  })
})

describe('buildPlan (AI text + engine numbers)', () => {
  const event = {
    id: 'e',
    status: 'planning',
    occasion: 'birthday',
    eventName: 'Party',
    eventDate: addDays(TODAY, 3),
    location: 'Pune',
    guestCount: 30,
    budgetMinor: 500_000,
    currency: 'INR',
    venuePreference: 'outdoor',
    themePreferences: [],
    ageGroup: '',
    dietaryRequirements: [],
    additionalInstructions: '',
    invitationText: '',
    invitationTone: 'friendly',
    createdAt: '',
    updatedAt: '',
  } as CelebrationEvent
  const analysis = analyzeEvent(event, TODAY)
  const budget = allocateBudget(event.budgetMinor, analysis.flags)
  const ai: AiPlan = {
    summary: 'A cosy garden party.',
    theme: { name: 'Garden', description: 'Fairy lights.', reasoning: 'Outdoor.' },
    recommendations: [
      {
        category: 'Food',
        budgetCategory: 'food',
        recommendation: 'Snacks',
        explanation: 'e',
        reasoning: 'r',
        assumptions: [],
      },
      {
        category: 'More food',
        budgetCategory: 'food',
        recommendation: 'Cake',
        explanation: 'e',
        reasoning: 'r',
        assumptions: [],
      },
      {
        category: 'Logistics',
        budgetCategory: null,
        recommendation: 'Parking',
        explanation: 'e',
        reasoning: 'r',
        assumptions: [],
      },
    ],
    schedule: [
      { time: '18:00', activity: 'Cake' },
      { time: '16:00', activity: 'Arrive' },
      { time: '17:00', activity: 'Games' },
    ],
    risks: [{ issue: 'Mosquitoes', mitigation: 'Repellent' }],
    assumptions: ['All costs are estimates based on typical prices, not vendor quotations.', 'Guests drive'],
    extraTasks: [
      { title: 'Buy fairy lights', priority: 'medium', kind: 'shopping', daysBeforeEvent: 30 },
      { title: 'send invitations', priority: 'low', kind: 'invitation', daysBeforeEvent: 1 },
    ],
  }
  const plan = buildPlan({
    ai,
    event,
    analysis,
    budget,
    tasks: planTasks(event, analysis, TODAY),
    today: TODAY,
    contextHash: 'a'.repeat(64),
  })

  it('produces a schema-valid plan', () => {
    expect(eventPlanSchema.safeParse(plan).success).toBe(true)
  })

  it('takes costs from the engine allocation, once per category', () => {
    const food = budget.find((b) => b.category === 'food')!.amountMinor
    expect(plan.recommendations.map((r) => r.estimatedCostMinor)).toEqual([food, null, null])
    expect(plan.budget.reduce((s, b) => s + b.amountMinor, 0)).toBe(500_000)
  })

  it('clamps AI task lead times so no deadline is in the past, and skips duplicates', () => {
    const lights = plan.checklist.find((t) => t.title === 'Buy fairy lights')!
    expect(lights.dueDate).toBe(TODAY)
    expect(plan.checklist.filter((t) => /send invitations/i.test(t.title))).toHaveLength(1)
  })

  it('sorts the schedule, keeps engine risks first and de-duplicates assumptions', () => {
    expect(plan.schedule.map((s) => s.time)).toEqual(['16:00', '17:00', '18:00'])
    expect(plan.risks.slice(0, analysis.risks.length)).toEqual(analysis.risks)
    expect(plan.risks.at(-1)!.issue).toBe('Mosquitoes')
    expect(plan.assumptions.filter((a) => a.startsWith('All costs'))).toHaveLength(1)
    expect(plan.decisions.map((d) => d.rule)).toEqual(
      expect.arrayContaining(['Tight budget', 'Outdoor venue', 'Urgent timeline']),
    )
  })
})
