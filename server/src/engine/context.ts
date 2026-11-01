// Deterministic event analysis: what's missing, which planning rules apply, and the
// risks/assumptions that follow from them. The AI explains these; it never decides them.
import { daysBetween, formatMoney, type CelebrationEvent, type CurrencyCode } from '@celebrai/shared'

export interface Flags {
  lowBudget: boolean
  largeGuests: boolean
  outdoor: boolean
  children: boolean
  shortNotice: boolean
}

export interface Analysis {
  daysUntil: number | null
  flags: Flags & { urgent: boolean; wedding: boolean; dietary: string[] }
  decisions: Array<{ rule: string; detail: string }>
  risks: Array<{ issue: string; mitigation: string }>
  assumptions: string[]
}

export interface MissingDetail {
  field: 'occasion' | 'eventDate' | 'guestCount' | 'budgetMinor'
  question: string
}

/** Below this spend per guest (minor units) a celebration is treated as tight. Weddings ×3. */
const LOW_BUDGET_PER_GUEST: Record<CurrencyCode, number> = { INR: 40_000, USD: 1_500, EUR: 1_500, GBP: 1_200 }
const LARGE_GUEST_COUNT = 150
const SHORT_NOTICE_DAYS = 14
const URGENT_DAYS = 3
const CHILD_AGE = /child|kid|toddler|teen|under 12/i
const CHILD_BIRTHDAY = /\b([1-9]|1[0-2])(st|nd|rd|th)\s+birthday/i

/** Critical details, in the order the assistant should ask for them. */
export function missingDetails(event: CelebrationEvent): MissingDetail[] {
  const missing: MissingDetail[] = []
  if (!event.occasion) missing.push({ field: 'occasion', question: 'What are you celebrating — a birthday, wedding, anniversary or something else?' })
  if (!event.eventDate) missing.push({ field: 'eventDate', question: 'What date is the event? I need it to build a realistic schedule.' })
  if (!event.guestCount) missing.push({ field: 'guestCount', question: 'Roughly how many guests are you expecting?' })
  if (!event.budgetMinor) missing.push({ field: 'budgetMinor', question: 'What’s your total budget?' })
  return missing
}

export function analyzeEvent(event: CelebrationEvent, today: string): Analysis {
  const daysUntil = event.eventDate ? daysBetween(today, event.eventDate) : null
  const wedding = event.occasion === 'wedding'
  const perGuest = event.guestCount ? Math.round(event.budgetMinor / event.guestCount / 100) * 100 : null
  const threshold = LOW_BUDGET_PER_GUEST[event.currency] * (wedding ? 3 : 1)

  const flags = {
    lowBudget: perGuest !== null && perGuest < threshold,
    largeGuests: (event.guestCount ?? 0) >= LARGE_GUEST_COUNT,
    outdoor: event.venuePreference === 'outdoor',
    children: CHILD_AGE.test(event.ageGroup) || CHILD_BIRTHDAY.test(event.eventName) || event.occasion === 'baby_shower' && CHILD_AGE.test(event.additionalInstructions),
    shortNotice: daysUntil !== null && daysUntil <= SHORT_NOTICE_DAYS,
    urgent: daysUntil !== null && daysUntil <= URGENT_DAYS,
    wedding,
    dietary: event.dietaryRequirements,
  }

  const decisions: Analysis['decisions'] = []
  const risks: Analysis['risks'] = []
  const money = (m: number) => formatMoney(m, event.currency)

  if (flags.lowBudget) {
    decisions.push({
      rule: 'Tight budget',
      detail: `${money(perGuest!)} per guest is below the ${money(threshold)} we plan around, so essentials (food, a usable space) come first and photography, entertainment and décor are scaled back.`,
    })
    risks.push({ issue: 'Not every wish will fit the budget.', mitigation: 'Prioritise food and space; use DIY décor, digital invitations and a friend for photos.' })
  }
  if (flags.largeGuests) {
    decisions.push({ rule: 'Large guest count', detail: `${event.guestCount} guests needs more catering capacity, staff and space, so food and venue get a larger share.` })
    risks.push({ issue: 'Venue capacity is not confirmed.', mitigation: `Verify the venue can seat ${event.guestCount} guests (plus staff) before paying a deposit.` })
  }
  if (flags.outdoor) {
    decisions.push({ rule: 'Outdoor venue', detail: 'Weather can change plans, so extra contingency is set aside for a tent or indoor backup.' })
    risks.push({ issue: 'Bad weather (rain, heat or wind) on the day.', mitigation: 'Book a tent or reserve an indoor backup space; check the forecast 3 days before.' })
  }
  if (flags.children) {
    decisions.push({ rule: 'Children attending', detail: 'Activities are kept short and age-appropriate, and entertainment gets a larger share.' })
    risks.push({ issue: 'Child safety at a busy party.', mitigation: 'Assign adults to supervise play areas; keep small objects and balloons away from toddlers.' })
  }
  if (flags.urgent) {
    decisions.push({ rule: 'Urgent timeline', detail: `Only ${daysUntil} day(s) to go: every booking is due now and the plan favours options that can be arranged quickly.` })
    risks.push({ issue: 'Vendors may already be booked.', mitigation: 'Contact at least two options per vendor today and keep a DIY fallback.' })
  } else if (flags.shortNotice) {
    decisions.push({ rule: 'Short notice', detail: `${daysUntil} days to go: bookings are prioritised and lead times are compressed.` })
  }
  if (flags.dietary.length > 0) {
    decisions.push({ rule: 'Dietary requirements', detail: `Catering must cover: ${flags.dietary.join(', ')}.` })
    risks.push({ issue: 'Dietary needs missed by the caterer.', mitigation: `Confirm ${flags.dietary.join(', ')} options in writing and label dishes on the day.` })
  }

  const assumptions = [
    'All costs are estimates based on typical prices, not vendor quotations.',
    'Venue and vendor availability is not verified — confirm directly before booking.',
  ]
  if (!event.location) assumptions.push('No location given, so prices assume a typical Indian metro city.')

  return { daysUntil, flags, decisions, risks, assumptions }
}
