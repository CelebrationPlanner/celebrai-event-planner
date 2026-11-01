// DEMO DATA — clearly labelled sample content used until the API is connected (Phase 5).
// Dates are generated relative to "today" so the demo never shows past deadlines.
import { addDays, todayISO } from '@/lib/dates'
import type { Activity, CelebrationEvent, ChatMessage, EventPlan, Expense, Task } from '@/types'

export interface DemoState {
  events: CelebrationEvent[]
  plans: EventPlan[]
  expenses: Expense[]
  tasks: Task[]
  messages: ChatMessage[]
  activity: Activity[]
  profile: { name: string; email: string; timeZone: string; defaultCurrency: CelebrationEvent['currency'] }
}

export function createDemoState(today: string = todayISO()): DemoState {
  const now = new Date().toISOString()
  const birthday = 'demo-birthday'
  const anniversary = 'demo-anniversary'
  const birthdayDate = addDays(today, 12)

  const events: CelebrationEvent[] = [
    {
      id: birthday,
      status: 'planning',
      occasion: 'birthday',
      eventName: "Anaya's 5th Birthday",
      eventDate: birthdayDate,
      location: 'Pune',
      guestCount: 40,
      budgetMinor: 2_500_000,
      currency: 'INR',
      venuePreference: 'flexible',
      themePreferences: ['Princess', 'Pastel'],
      ageGroup: 'Children (3–7)',
      dietaryRequirements: ['Vegetarian'],
      additionalInstructions: 'Around 20 children and 20 adults. Prefer an afternoon party.',
      invitationTone: 'friendly',
      invitationText:
        "You're invited to a royal celebration! 👑\n\nJoin us for Anaya's 5th Birthday Princess Party.\n\nDate: " +
        birthdayDate +
        '\nTime: 4:00 PM – 7:00 PM\nPlace: Pune (venue details to follow)\n\nCome dressed as your favourite prince or princess!\nPlease RSVP by ' +
        addDays(today, 7) +
        '.',
      createdAt: now,
    },
    {
      id: anniversary,
      status: 'draft',
      occasion: 'anniversary',
      eventName: "Rohan & Meera's 10th Anniversary",
      eventDate: addDays(today, 30),
      location: 'Mumbai',
      guestCount: 20,
      budgetMinor: 1_500_000,
      currency: 'INR',
      venuePreference: 'indoor',
      themePreferences: ['Elegant', 'Intimate dinner'],
      ageGroup: 'Adults',
      dietaryRequirements: [],
      additionalInstructions: '',
      invitationTone: 'formal',
      invitationText: '',
      createdAt: now,
    },
  ]

  const plans: EventPlan[] = [
    {
      eventId: birthday,
      version: 1,
      createdAt: now,
      summary:
        'An afternoon princess party for 40 guests (about 20 children aged 3–7) in Pune, 12 days away, within a ₹25,000 budget. Vegetarian menu, venue still to be chosen.',
      theme: {
        name: 'Pastel Princess Garden',
        description: 'Soft pink and lavender décor, a balloon arch "castle gate", tiaras and wands as welcome favours.',
        reasoning:
          'Anaya loves princess themes. Pastels photograph well in daylight and balloon décor is the most affordable way to transform a hall or society clubhouse.',
      },
      recommendations: [
        {
          category: 'Venue',
          recommendation: 'Book a society clubhouse or small party hall for 4–7 PM.',
          explanation: 'Indoor space keeps the party safe from rain and heat and is easy to decorate.',
          reasoning: '40 guests needs roughly 600–800 sq ft. Clubhouses are typically cheaper than banquet halls for short afternoon slots.',
          estimatedCostMinor: 500_000,
          assumptions: ['Availability is not verified — confirm with the venue.', 'Price is an estimate, not a quote.'],
        },
        {
          category: 'Food & catering',
          recommendation: 'Vegetarian kid-friendly snacks plus a light dinner buffet for adults.',
          explanation: 'Children eat little and prefer finger food; adults expect a proper meal at a 7 PM finish.',
          reasoning: 'Splitting the menu avoids paying full buffet rates for 20 children.',
          estimatedCostMinor: 800_000,
          assumptions: ['Estimated at ~₹200 per guest.', 'All food vegetarian as requested.'],
        },
        {
          category: 'Entertainment',
          recommendation: 'Hire a magician or game host for 60 minutes.',
          explanation: 'Structured activities keep 3–7 year-olds engaged and give parents a break.',
          reasoning: 'Age-appropriate: short attention spans favour a single high-energy act over multiple stations.',
          estimatedCostMinor: 300_000,
          assumptions: ['Rates vary by city and season.'],
        },
      ],
      schedule: [
        { time: '15:00', activity: 'Decorator and caterer arrive; set up balloon arch' },
        { time: '16:00', activity: 'Guests arrive; tiara and wand welcome favours' },
        { time: '16:30', activity: 'Magician show' },
        { time: '17:30', activity: 'Cake cutting and photos' },
        { time: '18:00', activity: 'Dinner buffet and kids’ games' },
        { time: '19:00', activity: 'Return gifts and goodbyes' },
      ],
      risks: [
        { issue: 'Only 12 days to prepare — popular entertainers may be booked.', mitigation: 'Contact two entertainers today; keep a games-host backup.' },
        { issue: 'Small children and balloons.', mitigation: 'Keep latex balloons out of reach of under-3s; supervise the play area.' },
      ],
      assumptions: ['Costs are estimates for Pune, not vendor quotations.', 'Venue capacity must be verified.'],
    },
  ]

  const expenseRows: Array<[Expense['category'], number, number | null]> = [
    ['venue', 500_000, null],
    ['food', 800_000, 250_000],
    ['decoration', 400_000, 150_000],
    ['photography', 200_000, null],
    ['entertainment', 300_000, null],
    ['invitations', 50_000, 20_000],
    ['miscellaneous', 50_000, null],
    ['contingency', 200_000, null],
  ]
  const expenses: Expense[] = expenseRows.map(([category, estimatedMinor, actualMinor]) => ({
    id: `demo-exp-${category}`,
    eventId: birthday,
    category,
    estimatedMinor,
    actualMinor,
  }))

  const taskRows: Array<[string, Task['priority'], number, boolean, Task['kind'], string]> = [
    ['Shortlist and book the venue', 'high', 2, true, 'vendor', birthday],
    ['Book magician or game host', 'high', 3, false, 'vendor', birthday],
    ['Send invitations', 'high', 4, false, 'invitation', birthday],
    ['Confirm caterer and final menu', 'high', 6, false, 'vendor', birthday],
    ['Order cake (vegetarian, eggless)', 'medium', 8, false, 'vendor', birthday],
    ['Buy return gifts and favours', 'medium', 9, false, 'shopping', birthday],
    ['Collect RSVPs and final headcount', 'medium', 7, false, 'invitation', birthday],
    ['Confirm decorator arrival time', 'low', 11, false, 'preparation', birthday],
    ['Decide guest list', 'high', 5, false, 'preparation', anniversary],
    ['Shortlist restaurants with private dining', 'medium', 10, false, 'vendor', anniversary],
  ]
  const tasks: Task[] = taskRows.map(([title, priority, offset, completed, kind, eventId], i) => ({
    id: `demo-task-${i}`,
    eventId,
    title,
    priority,
    dueDate: addDays(today, offset),
    completed,
    kind,
  }))

  const messages: ChatMessage[] = [
    {
      id: 'demo-msg-1',
      eventId: birthday,
      role: 'user',
      content:
        "I want to organize my daughter's 5th birthday party in Pune for 40 guests. My budget is ₹25,000. She loves princess themes. The event is in 12 days.",
      createdAt: now,
    },
    {
      id: 'demo-msg-2',
      eventId: birthday,
      role: 'assistant',
      content:
        'Lovely! I have the occasion, city, guest count, budget, theme and date. Two quick questions so the plan fits: roughly how many of the 40 guests are children, and are there any dietary requirements?',
      createdAt: now,
    },
    { id: 'demo-msg-3', eventId: birthday, role: 'user', content: 'About 20 kids. Everything should be vegetarian.', createdAt: now },
    {
      id: 'demo-msg-4',
      eventId: birthday,
      role: 'assistant',
      content:
        'Thanks — I’ve generated your plan. Because there are only 12 days, venue and entertainer bookings are marked urgent. I set aside ₹2,000 as contingency and kept the menu fully vegetarian.',
      createdAt: now,
    },
  ]

  const activity: Activity[] = [
    { id: 'demo-act-1', eventId: birthday, message: 'Plan generated for Anaya’s 5th Birthday', at: now },
    { id: 'demo-act-2', eventId: birthday, message: 'Completed “Shortlist and book the venue”', at: now },
    { id: 'demo-act-3', eventId: anniversary, message: 'Created Rohan & Meera’s 10th Anniversary', at: now },
  ]

  return {
    events,
    plans,
    expenses,
    tasks,
    messages,
    activity,
    profile: { name: 'Demo Planner', email: 'demo@celebrai.app', timeZone: 'Asia/Kolkata', defaultCurrency: 'INR' },
  }
}
