// Worked examples for the occasion guide pages: each event's details and what the planning engine
// produces for them. Stored so the pages need no API; server/src/engine/occasionExamples.test.ts
// re-runs the engine on these inputs and fails if any number or rule here drifts from it.
import type { BudgetCategory, CelebrationEvent, Priority } from '@celebrai/shared'

export interface OccasionExample {
  input: {
    occasion: 'birthday' | 'wedding' | 'baby_shower' | 'anniversary'
    eventName: string
    guestCount: number
    budgetMinor: number
    venuePreference: CelebrationEvent['venuePreference']
    location: string
    ageGroup: string
    dietaryRequirements: string[]
    /** Days from planning to the event. */
    daysUntil: number
  }
  decisions: Array<{ rule: string; detail: string }>
  budget: Array<{ category: BudgetCategory; amountMinor: number; reasoning: string }>
  tasks: Array<{ title: string; priority: Priority; daysBefore: number }>
  risks: Array<{ issue: string; mitigation: string }>
}

export const OCCASION_EXAMPLES = {
  birthday: {
    input: {
      occasion: 'birthday',
      eventName: "Aarav's 5th birthday",
      guestCount: 40,
      budgetMinor: 2500000,
      venuePreference: 'indoor',
      location: 'Pune',
      ageGroup: 'Kids',
      dietaryRequirements: [],
      daysUntil: 45,
    },
    decisions: [
      {
        rule: 'Children attending',
        detail: 'Activities are kept short and age-appropriate, and entertainment gets a larger share.',
      },
    ],
    budget: [
      {
        category: 'venue',
        amountMinor: 500000,
        reasoning: 'Space for your guests.',
      },
      {
        category: 'food',
        amountMinor: 750000,
        reasoning: 'Usually the largest cost: food and drinks for every guest.',
      },
      {
        category: 'decoration',
        amountMinor: 375000,
        reasoning: 'Sets the theme and atmosphere.',
      },
      {
        category: 'photography',
        amountMinor: 175000,
        reasoning: 'Captures the memories. Children’s activities take priority.',
      },
      {
        category: 'entertainment',
        amountMinor: 325000,
        reasoning: 'Keeps guests engaged. Children’s activities take priority.',
      },
      {
        category: 'invitations',
        amountMinor: 75000,
        reasoning: 'Printed or digital invitations.',
      },
      {
        category: 'miscellaneous',
        amountMinor: 50000,
        reasoning: 'Small items: candles, cutlery, tips.',
      },
      {
        category: 'contingency',
        amountMinor: 250000,
        reasoning: 'A buffer for last-minute costs. Leave it untouched until the final week.',
      },
    ],
    tasks: [
      {
        title: 'Finalise the guest list',
        priority: 'high',
        daysBefore: 28,
      },
      {
        title: 'Shortlist and book the venue',
        priority: 'high',
        daysBefore: 30,
      },
      {
        title: 'Book the caterer and fix the menu',
        priority: 'high',
        daysBefore: 21,
      },
      {
        title: 'Book the decorator',
        priority: 'medium',
        daysBefore: 14,
      },
      {
        title: 'Book a photographer',
        priority: 'medium',
        daysBefore: 14,
      },
      {
        title: 'Book an age-appropriate entertainer',
        priority: 'medium',
        daysBefore: 14,
      },
      {
        title: 'Send invitations',
        priority: 'high',
        daysBefore: 21,
      },
      {
        title: 'Collect RSVPs and confirm the headcount',
        priority: 'medium',
        daysBefore: 7,
      },
      {
        title: 'Buy supplies, favours and return gifts',
        priority: 'medium',
        daysBefore: 5,
      },
      {
        title: 'Reconfirm every vendor’s time and address',
        priority: 'high',
        daysBefore: 2,
      },
      {
        title: 'Prepare the event-day run sheet',
        priority: 'low',
        daysBefore: 1,
      },
    ],
    risks: [
      {
        issue: 'Child safety at a busy party.',
        mitigation: 'Assign adults to supervise play areas; keep small objects and balloons away from toddlers.',
      },
    ],
  },
  wedding: {
    input: {
      occasion: 'wedding',
      eventName: "Riya and Kabir's wedding",
      guestCount: 200,
      budgetMinor: 50000000,
      venuePreference: 'indoor',
      location: 'Pune',
      ageGroup: '',
      dietaryRequirements: ['Vegetarian', 'Jain'],
      daysUntil: 240,
    },
    decisions: [
      {
        rule: 'Large guest count',
        detail: '200 guests needs more catering capacity, staff and space, so food and venue get a larger share.',
      },
      {
        rule: 'Dietary requirements',
        detail: 'Catering must cover: Vegetarian, Jain.',
      },
    ],
    budget: [
      {
        category: 'venue',
        amountMinor: 11500000,
        reasoning: 'Space for your guests. More guests need a bigger space.',
      },
      {
        category: 'food',
        amountMinor: 17500000,
        reasoning: 'Usually the largest cost: food and drinks for every guest. More guests need more catering.',
      },
      {
        category: 'decoration',
        amountMinor: 6500000,
        reasoning: 'Sets the theme and atmosphere. More guests need more catering.',
      },
      {
        category: 'photography',
        amountMinor: 3500000,
        reasoning: 'Captures the memories. More guests need more catering.',
      },
      {
        category: 'entertainment',
        amountMinor: 3500000,
        reasoning: 'Keeps guests engaged. More guests need a bigger space.',
      },
      {
        category: 'invitations',
        amountMinor: 1500000,
        reasoning: 'Printed or digital invitations.',
      },
      {
        category: 'miscellaneous',
        amountMinor: 1000000,
        reasoning: 'Small items: candles, cutlery, tips.',
      },
      {
        category: 'contingency',
        amountMinor: 5000000,
        reasoning: 'A buffer for last-minute costs. Leave it untouched until the final week.',
      },
    ],
    tasks: [
      {
        title: 'Finalise the guest list',
        priority: 'high',
        daysBefore: 84,
      },
      {
        title: 'Shortlist and book the venue',
        priority: 'high',
        daysBefore: 90,
      },
      {
        title: 'Book the caterer and fix the menu',
        priority: 'high',
        daysBefore: 63,
      },
      {
        title: 'Confirm dietary options with the caterer: Vegetarian, Jain',
        priority: 'high',
        daysBefore: 42,
      },
      {
        title: 'Book the decorator',
        priority: 'medium',
        daysBefore: 42,
      },
      {
        title: 'Book a photographer',
        priority: 'medium',
        daysBefore: 42,
      },
      {
        title: 'Book entertainment',
        priority: 'medium',
        daysBefore: 42,
      },
      {
        title: 'Send invitations',
        priority: 'high',
        daysBefore: 63,
      },
      {
        title: 'Collect RSVPs and confirm the headcount',
        priority: 'medium',
        daysBefore: 21,
      },
      {
        title: 'Buy supplies, favours and return gifts',
        priority: 'medium',
        daysBefore: 15,
      },
      {
        title: 'Reconfirm every vendor’s time and address',
        priority: 'high',
        daysBefore: 6,
      },
      {
        title: 'Prepare the event-day run sheet',
        priority: 'low',
        daysBefore: 3,
      },
    ],
    risks: [
      {
        issue: 'Venue capacity is not confirmed.',
        mitigation: 'Verify the venue can seat 200 guests (plus staff) before paying a deposit.',
      },
      {
        issue: 'Dietary needs missed by the caterer.',
        mitigation: 'Confirm Vegetarian, Jain options in writing and label dishes on the day.',
      },
    ],
  },
  baby_shower: {
    input: {
      occasion: 'baby_shower',
      eventName: "Meera's baby shower",
      guestCount: 30,
      budgetMinor: 1000000,
      venuePreference: 'indoor',
      location: 'Mumbai',
      ageGroup: '',
      dietaryRequirements: [],
      daysUntil: 30,
    },
    decisions: [
      {
        rule: 'Tight budget',
        detail:
          '₹333 per guest is below the ₹400 we plan around, so essentials (food, a usable space) come first and photography, entertainment and décor are scaled back.',
      },
    ],
    budget: [
      {
        category: 'venue',
        amountMinor: 250000,
        reasoning:
          'Space for your guests. Reduced for a tight budget: simple DIY décor. Reduced for a tight budget: digital invitations.',
      },
      {
        category: 'food',
        amountMinor: 410000,
        reasoning:
          'Usually the largest cost: food and drinks for every guest. Reduced for a tight budget: a friend or phone photos instead. Reduced for a tight budget: DIY games instead of paid acts.',
      },
      {
        category: 'decoration',
        amountMinor: 120000,
        reasoning: 'Sets the theme and atmosphere. Reduced for a tight budget: simple DIY décor.',
      },
      {
        category: 'photography',
        amountMinor: 40000,
        reasoning: 'Captures the memories. Reduced for a tight budget: a friend or phone photos instead.',
      },
      {
        category: 'entertainment',
        amountMinor: 50000,
        reasoning: 'Keeps guests engaged. Reduced for a tight budget: DIY games instead of paid acts.',
      },
      {
        category: 'invitations',
        amountMinor: 10000,
        reasoning: 'Printed or digital invitations. Reduced for a tight budget: digital invitations.',
      },
      {
        category: 'miscellaneous',
        amountMinor: 20000,
        reasoning: 'Small items: candles, cutlery, tips.',
      },
      {
        category: 'contingency',
        amountMinor: 100000,
        reasoning: 'A buffer for last-minute costs. Leave it untouched until the final week.',
      },
    ],
    tasks: [
      {
        title: 'Finalise the guest list',
        priority: 'high',
        daysBefore: 28,
      },
      {
        title: 'Shortlist and book the venue',
        priority: 'high',
        daysBefore: 30,
      },
      {
        title: 'Book the caterer and fix the menu',
        priority: 'high',
        daysBefore: 21,
      },
      {
        title: 'Book the decorator',
        priority: 'medium',
        daysBefore: 14,
      },
      {
        title: 'Ask a friend to take photos',
        priority: 'low',
        daysBefore: 7,
      },
      {
        title: 'Send invitations',
        priority: 'high',
        daysBefore: 21,
      },
      {
        title: 'Collect RSVPs and confirm the headcount',
        priority: 'medium',
        daysBefore: 7,
      },
      {
        title: 'Buy supplies, favours and return gifts',
        priority: 'medium',
        daysBefore: 5,
      },
      {
        title: 'Reconfirm every vendor’s time and address',
        priority: 'high',
        daysBefore: 2,
      },
      {
        title: 'Prepare the event-day run sheet',
        priority: 'low',
        daysBefore: 1,
      },
    ],
    risks: [
      {
        issue: 'Not every wish will fit the budget.',
        mitigation: 'Prioritise food and space; use DIY décor, digital invitations and a friend for photos.',
      },
    ],
  },
  anniversary: {
    input: {
      occasion: 'anniversary',
      eventName: "Parents' 25th anniversary dinner",
      guestCount: 20,
      budgetMinor: 1500000,
      venuePreference: 'outdoor',
      location: 'Bengaluru',
      ageGroup: '',
      dietaryRequirements: [],
      daysUntil: 40,
    },
    decisions: [
      {
        rule: 'Outdoor venue',
        detail: 'Weather can change plans, so extra contingency is set aside for a tent or indoor backup.',
      },
    ],
    budget: [
      {
        category: 'venue',
        amountMinor: 300000,
        reasoning: 'Space for your guests.',
      },
      {
        category: 'food',
        amountMinor: 450000,
        reasoning: 'Usually the largest cost: food and drinks for every guest.',
      },
      {
        category: 'decoration',
        amountMinor: 187500,
        reasoning: 'Sets the theme and atmosphere. Extra buffer for a tent or indoor backup.',
      },
      {
        category: 'photography',
        amountMinor: 150000,
        reasoning: 'Captures the memories.',
      },
      {
        category: 'entertainment',
        amountMinor: 112500,
        reasoning: 'Keeps guests engaged. Extra buffer for a tent or indoor backup.',
      },
      {
        category: 'invitations',
        amountMinor: 45000,
        reasoning: 'Printed or digital invitations.',
      },
      {
        category: 'miscellaneous',
        amountMinor: 30000,
        reasoning: 'Small items: candles, cutlery, tips.',
      },
      {
        category: 'contingency',
        amountMinor: 225000,
        reasoning:
          'A buffer for last-minute costs. Leave it untouched until the final week. Extra buffer for a tent or indoor backup.',
      },
    ],
    tasks: [
      {
        title: 'Finalise the guest list',
        priority: 'high',
        daysBefore: 28,
      },
      {
        title: 'Shortlist and book the venue',
        priority: 'high',
        daysBefore: 30,
      },
      {
        title: 'Book the caterer and fix the menu',
        priority: 'high',
        daysBefore: 21,
      },
      {
        title: 'Book the decorator',
        priority: 'medium',
        daysBefore: 14,
      },
      {
        title: 'Book a photographer',
        priority: 'medium',
        daysBefore: 14,
      },
      {
        title: 'Book entertainment',
        priority: 'medium',
        daysBefore: 14,
      },
      {
        title: 'Arrange a weather backup (tent or indoor space)',
        priority: 'high',
        daysBefore: 10,
      },
      {
        title: 'Send invitations',
        priority: 'high',
        daysBefore: 21,
      },
      {
        title: 'Collect RSVPs and confirm the headcount',
        priority: 'medium',
        daysBefore: 7,
      },
      {
        title: 'Buy supplies, favours and return gifts',
        priority: 'medium',
        daysBefore: 5,
      },
      {
        title: 'Reconfirm every vendor’s time and address',
        priority: 'high',
        daysBefore: 2,
      },
      {
        title: 'Prepare the event-day run sheet',
        priority: 'low',
        daysBefore: 1,
      },
    ],
    risks: [
      {
        issue: 'Bad weather (rain, heat or wind) on the day.',
        mitigation: 'Book a tent or reserve an indoor backup space; check the forecast 3 days before.',
      },
    ],
  },
} satisfies Record<OccasionExample['input']['occasion'], OccasionExample>
