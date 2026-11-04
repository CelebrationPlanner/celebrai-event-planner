// Static copy for the landing page.
import {
  Baby,
  Briefcase,
  Cake,
  CalendarClock,
  CloudRain,
  Flame,
  Gem,
  Heart,
  ListChecks,
  Mail,
  MessageSquareText,
  Salad,
  ShieldAlert,
  Timer,
  Users,
  Wallet,
} from 'lucide-react'
import type { Occasion } from '@/types'

export const EXAMPLES: Array<{ occasion: Occasion; icon: typeof Cake; title: string; example: string }> = [
  { occasion: 'birthday', icon: Cake, title: 'Birthdays', example: 'A princess party for 40 in Pune on ₹25,000' },
  { occasion: 'wedding', icon: Heart, title: 'Weddings', example: '200 guests, three functions, one realistic budget' },
  {
    occasion: 'anniversary',
    icon: Gem,
    title: 'Anniversaries',
    example: 'An intimate dinner for 20 that feels special',
  },
  {
    occasion: 'baby_shower',
    icon: Baby,
    title: 'Baby showers',
    example: 'A daytime gathering with games and a light menu',
  },
  {
    occasion: 'engagement',
    icon: Gem,
    title: 'Engagements',
    example: 'Ring ceremony, décor and family-friendly timing',
  },
  {
    occasion: 'corporate',
    icon: Briefcase,
    title: 'Corporate events',
    example: 'Team offsite for 60 with dietary needs covered',
  },
  {
    occasion: 'family',
    icon: Users,
    title: 'Family celebrations',
    example: 'A reunion that works for grandparents and kids',
  },
  { occasion: 'festival', icon: Flame, title: 'Festivals', example: 'Diwali get-together with a home-décor budget' },
]

export const STEPS = [
  {
    title: 'Describe your celebration',
    body: 'Type it the way you’d tell a friend — who, where, when, how many and your budget.',
  },
  {
    title: 'Answer only what’s missing',
    body: 'CelebrAI picks out what you’ve already said and asks just the questions that change the plan.',
  },
  {
    title: 'Get a plan you can edit',
    body: 'Theme, budget, checklist, timeline and invitation — each recommendation explains why.',
  },
]

export const FEATURES = [
  {
    icon: MessageSquareText,
    title: 'Context-aware assistant',
    body: 'Understands natural language and remembers your event details during planning.',
  },
  {
    icon: Wallet,
    title: 'Smart budget planner',
    body: 'Category allocations, actual spend and overrun warnings, with backend-checked totals.',
  },
  {
    icon: ListChecks,
    title: 'Automatic checklist',
    body: 'Tasks prioritised by urgency, with realistic due dates — never in the past.',
  },
  {
    icon: CalendarClock,
    title: 'Event timeline',
    body: 'Preparation milestones, vendor deadlines and an hour-by-hour event-day schedule.',
  },
  {
    icon: Mail,
    title: 'Invitation studio',
    body: 'Formal, friendly, traditional or modern invitations you can edit, copy and share.',
  },
  {
    icon: ShieldAlert,
    title: 'Risks & contingencies',
    body: 'Flags what could go wrong and what to do about it before it happens.',
  },
]

export const DECISIONS = [
  { icon: Wallet, when: 'Tight budget', then: 'prioritises essentials and suggests affordable alternatives' },
  { icon: CloudRain, when: 'Outdoor venue', then: 'adds a weather backup and indoor contingency' },
  { icon: Timer, when: 'Event in days, not weeks', then: 'moves bookings to the top and drops unrealistic lead times' },
  { icon: Salad, when: 'Dietary needs', then: 'highlights them in every catering recommendation' },
]
