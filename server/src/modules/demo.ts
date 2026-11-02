import { addDays } from '@celebrai/shared'
import { Router } from 'express'
import type { AiPlan } from '../ai/schemas.ts'
import { toEvent } from '../db/mappers.ts'
import { allocateBudget } from '../engine/budget.ts'
import { analyzeEvent } from '../engine/context.ts'
import { buildPlan } from '../engine/plan.ts'
import { planTasks } from '../engine/tasks.ts'
import { AppError, unwrap, unwrapMaybe } from '../lib/errors.ts'
import { getAuth } from '../middleware/auth.ts'
import { userToday } from './ownership.ts'
import { contextHash } from './planner.ts'

/**
 * Pre-written wording for the demo's sample plan, clearly labelled as a sample. Every number,
 * date, task, decision and risk in the seeded plan still comes from the real engine.
 */
const SAMPLE_TEXT: AiPlan = {
  summary:
    'Sample plan: an afternoon princess party for 40 guests (about 20 children) in Pune, 12 days away, on a ₹25,000 budget with a fully vegetarian menu.',
  theme: {
    name: 'Pastel Princess Garden',
    description: 'Soft pink and lavender décor, a balloon-arch “castle gate”, and tiaras and wands as welcome favours.',
    reasoning:
      'The birthday girl loves princesses, and balloon décor is the most affordable way to transform a hall or society clubhouse.',
  },
  recommendations: [
    {
      category: 'Venue',
      budgetCategory: 'venue',
      recommendation: 'Book a society clubhouse or small party hall for 4–7 PM.',
      explanation: 'An indoor space keeps children safe from heat and rain and is easy to decorate.',
      reasoning:
        'Forty guests need roughly 600–800 sq ft; clubhouses usually cost less than banquet halls for short afternoon slots.',
      assumptions: ['Availability is not verified — confirm with the venue.'],
    },
    {
      category: 'Food & catering',
      budgetCategory: 'food',
      recommendation: 'Vegetarian finger food for the children and a light buffet for the adults.',
      explanation: 'Children eat little and prefer snacks; adults expect a proper meal at a 7 PM finish.',
      reasoning: 'Splitting the menu avoids paying full buffet rates for 20 children.',
      assumptions: ['Everything vegetarian, as requested.'],
    },
    {
      category: 'Decoration',
      budgetCategory: 'decoration',
      recommendation: 'Balloon arch, pastel table covers and a photo corner with a cardboard castle.',
      explanation: 'High visual impact for little money.',
      reasoning: 'A short preparation window favours décor that a single decorator can set up in an hour.',
      assumptions: [],
    },
    {
      category: 'Entertainment',
      budgetCategory: 'entertainment',
      recommendation: 'A magician or game host for 45–60 minutes.',
      explanation: 'Structured activities keep 3–7 year-olds engaged and give parents a break.',
      reasoning: 'Short attention spans favour one high-energy act over several stations.',
      assumptions: ['Rates vary by season; book early.'],
    },
  ],
  schedule: [
    { time: '15:00', activity: 'Decorator and caterer arrive; set up the balloon arch' },
    { time: '16:00', activity: 'Guests arrive; tiara and wand welcome favours' },
    { time: '16:30', activity: 'Magician show' },
    { time: '17:30', activity: 'Cake cutting and photos' },
    { time: '18:00', activity: 'Dinner buffet and children’s games' },
    { time: '19:00', activity: 'Return gifts and goodbyes' },
  ],
  risks: [
    {
      issue: 'Popular entertainers may already be booked.',
      mitigation: 'Contact two entertainers today and keep a games host as backup.',
    },
  ],
  assumptions: ['This is sample content for the demo account.'],
  extraTasks: [{ title: 'Order an eggless cake', priority: 'medium', kind: 'vendor', daysBeforeEvent: 4 }],
}

export const demoRouter = Router()

/** Gives a fresh anonymous demo user one sample event with a complete plan (D10). Idempotent. */
demoRouter.post('/demo/seed', async (req, res) => {
  const { db, userId, isAnonymous } = getAuth(req)
  if (!isAnonymous) throw new AppError(403, 'FORBIDDEN', 'Sample data is only added to demo sessions.')

  const existing = unwrapMaybe(await db.from('events').select('id').eq('user_id', userId).limit(1).maybeSingle())
  if (existing) {
    res.json({ data: { seeded: false, eventId: existing.id } })
    return
  }

  const today = await userToday(db, userId)
  const eventDate = addDays(today, 12)
  const row = unwrap(
    await db
      .from('events')
      .insert({
        user_id: userId,
        status: 'draft',
        occasion: 'birthday',
        event_name: "Anaya's 5th Birthday (sample)",
        event_date: eventDate,
        location: 'Pune',
        guest_count: 40,
        budget_minor: 2_500_000,
        venue_preference: 'flexible',
        theme_preferences: ['Princess', 'Pastel'],
        age_group: 'Children (under 12)',
        dietary_requirements: ['Vegetarian'],
        additional_instructions: 'About 20 children and 20 adults. Afternoon party.',
        invitation_tone: 'friendly',
        invitation_text:
          `You're invited to a royal celebration! 👑\n\nJoin us for Anaya's 5th Birthday Princess Party.\n\nDate: ${eventDate}\nTime: ` +
          `4:00 PM – 7:00 PM\nPlace: Pune [Venue to be confirmed]\n\nCome dressed as your favourite prince or princess!`,
      })
      .select()
      .single(),
  )
  const event = toEvent(row)
  const analysis = analyzeEvent(event, today)
  const budget = allocateBudget(event.budgetMinor, analysis.flags)
  const plan = buildPlan({
    ai: SAMPLE_TEXT,
    event,
    analysis,
    budget,
    tasks: planTasks(event, analysis, today),
    today,
    contextHash: contextHash(event),
  })
  unwrap(
    await db.rpc('save_generated_plan', {
      p_event_id: event.id,
      p_plan: plan,
      p_expenses: plan.budget,
      p_tasks: plan.checklist,
    }),
  )

  const at = new Date().toISOString()
  const messages = [
    {
      role: 'user',
      content:
        "My daughter's 5th birthday in Pune for 40 guests, ₹25,000 budget, she loves princesses. It's in 12 days.",
      at,
    },
    {
      role: 'assistant',
      content:
        'This is a sample conversation for the demo. A princess party for 40 in Pune sounds lovely — your sample plan is ready to explore.',
      at,
    },
  ]
  unwrapMaybe(await db.from('conversations').insert({ event_id: event.id, user_id: userId, messages }))

  res.status(201).json({ data: { seeded: true, eventId: event.id } })
})
