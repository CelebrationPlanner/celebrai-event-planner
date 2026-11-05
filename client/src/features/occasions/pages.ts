// Copy for the public occasion guide pages. The worked example on each page (budget, rules,
// checklist, risks) comes from examples.ts, which is checked against the planning engine.
import { OCCASION_EXAMPLES, type OccasionExample } from './examples'

export interface OccasionPageContent {
  slug: string
  /** <title>; under 60 characters. */
  title: string
  /** Meta description; about 150 characters. */
  description: string
  h1: string
  intro: string
  exampleHeading: string
  cta: string
  tips: string[]
  faqs: Array<{ q: string; a: string }>
  example: OccasionExample
}

/** The home page's <title>, restored when leaving an occasion page. Same as index.html. */
export const HOME_TITLE = 'AI Event & Party Planner: Budget, Checklist | CelebrAI'

export const OCCASION_PAGES: OccasionPageContent[] = [
  {
    slug: 'birthday-party-planner',
    title: 'Birthday Party Budget Planner and Checklist | CelebrAI',
    description:
      'Plan a birthday party in India: a worked ₹25,000 budget for 40 guests, a dated checklist from booking to the big day, and the risks to plan for.',
    h1: 'Birthday Party Budget Planner and Checklist',
    intro:
      'A birthday party comes together when the money and the deadlines are decided early. Below is a real plan from ' +
      'CelebrAI for a kids’ party: how the budget is split, which tasks come first, and what to watch for. Describe ' +
      'your own party in one sentence and you get the same, worked out for your guests, budget and date.',
    exampleHeading: 'Example: a ₹25,000 kids’ birthday for 40 guests',
    cta: 'Plan your birthday party',
    tips: [
      'Fix the guest list before the venue: headcount decides the space and the food bill.',
      'For young children, keep each activity short and plan a quiet corner for breaks.',
      'Book an age-appropriate entertainer about two weeks ahead, and agree the length of the act.',
      'Keep the contingency untouched until the final week. Last-minute costs always appear.',
      'Return gifts and favours are easy to forget: buy them about five days before.',
    ],
    faqs: [
      {
        q: 'How should I split a birthday party budget?',
        a:
          'CelebrAI starts from venue 20%, food 30%, decoration 15%, photography 10%, entertainment 10%, ' +
          'invitations 3%, miscellaneous 2% and contingency 10%. When children attend, 3% moves from photography to ' +
          'entertainment, which is why the example above gives entertainment 13%.',
      },
      {
        q: 'When should I send birthday party invitations?',
        a:
          'About three weeks before the party, then collect RSVPs and confirm the headcount a week before so the ' +
          'caterer has a final number.',
      },
      {
        q: 'What if my budget is tight?',
        a:
          'If the budget is under about ₹400 a guest, CelebrAI puts food and a usable space first and scales back ' +
          'photography, entertainment and décor: a friend takes photos, games replace paid acts, invitations go digital.',
      },
    ],
    example: OCCASION_EXAMPLES.birthday,
  },
  {
    slug: 'wedding-budget-planner',
    title: 'Wedding Budget Planner and Checklist for India | CelebrAI',
    description:
      'A worked ₹5,00,000 wedding budget for 200 guests with vegetarian and Jain catering, a month-by-month checklist and the risks to settle early.',
    h1: 'Wedding Budget Planner and Checklist',
    intro:
      'With 200 guests, most of a wedding budget goes to food and space, and the bookings start months ahead. Here ' +
      'is a CelebrAI plan for an Indian wedding with vegetarian and Jain catering: the split, the reasons behind it ' +
      'and a checklist that starts three months out.',
    exampleHeading: 'Example: a ₹5,00,000 wedding for 200 guests',
    cta: 'Plan your wedding',
    tips: [
      'Confirm the venue’s seating for your full guest list, plus staff, before paying a deposit.',
      'Get dietary needs such as Jain food confirmed by the caterer in writing, and label the dishes.',
      'Book the venue first: in-demand dates go early, so start sooner than the checklist if you can.',
      'Keep 10% as contingency. Wedding costs grow in small amounts that add up.',
      'Send a reconfirmation to every vendor with the time and address about a week before.',
    ],
    faqs: [
      {
        q: 'How is a wedding budget for 200 guests split?',
        a:
          'In the example, food gets 35% and the venue 23%. From the starting split, a large guest count moves 5% to ' +
          'food and 3% to the venue, taken from photography, entertainment and décor, because more guests need more ' +
          'catering and space.',
      },
      {
        q: 'How far ahead should I book a wedding venue?',
        a:
          'CelebrAI schedules wedding tasks three times further ahead than other events, up to six months. The venue ' +
          'comes first, about 90 days before, with invitations about two months before.',
      },
      {
        q: 'Does CelebrAI check if a venue is available?',
        a:
          'No. It plans and explains, but it never claims a venue or vendor is free. Every cost is an estimate, not a ' +
          'quotation: confirm both directly before you book.',
      },
    ],
    example: OCCASION_EXAMPLES.wedding,
  },
  {
    slug: 'baby-shower-planner',
    title: 'Baby Shower Planner: Budget and Host Checklist | CelebrAI',
    description:
      'Host a baby shower on a budget: a worked ₹10,000 plan for 30 guests, where the money goes when it is tight, and a host checklist with dates.',
    h1: 'Baby Shower Planner: Budget and Host Checklist',
    intro:
      'A baby shower can be warm and memorable on a small budget if the money goes to the right things. This ' +
      'CelebrAI plan is for 30 guests on ₹10,000, which counts as a tight budget, so food and a comfortable space ' +
      'come first. The checklist is written for the host.',
    exampleHeading: 'Example: a ₹10,000 baby shower for 30 guests',
    cta: 'Plan your baby shower',
    tips: [
      'Plan a daytime gathering with a light menu: it costs less and suits the parent-to-be.',
      'Pick a comfortable space with good seating; a home or community hall works well.',
      'Use digital invitations and simple DIY décor when the budget is tight.',
      'Ask a friend to take photos instead of booking a photographer.',
      'Keep games short, and plan the order of the day on one page for helpers.',
    ],
    faqs: [
      {
        q: 'How do I plan a baby shower on a budget?',
        a:
          'At about ₹333 a guest, CelebrAI treats the budget as tight: food rises to 41% of it and the venue to 25%, ' +
          'while photography drops to 4% and invitations to 1%, with a friend for photos and digital invitations.',
      },
      {
        q: 'What should a baby shower host do first?',
        a:
          'Book the space about a month before and finalise the guest list, then the caterer three weeks before. ' +
          'Invitations go out three weeks ahead, and RSVPs are confirmed a week before.',
      },
      {
        q: 'Is there a baby shower checklist I can edit?',
        a:
          'Yes. Every plan in CelebrAI includes a checklist you can add to, edit, complete and filter, with due dates ' +
          'that are never in the past and never after the event.',
      },
    ],
    example: OCCASION_EXAMPLES.baby_shower,
  },
  {
    slug: 'anniversary-party-planner',
    title: 'Anniversary Party Planner on a Budget | CelebrAI',
    description:
      'Plan an anniversary celebration: a worked ₹15,000 outdoor dinner for 20 guests, a weather backup, and a checklist from booking to the evening.',
    h1: 'Anniversary Party Planner on a Budget',
    intro:
      'An anniversary dinner for close family and friends is about the evening, not the spend. This CelebrAI plan ' +
      'is for a 25th anniversary dinner outdoors for 20 guests on ₹15,000, with extra contingency for the weather ' +
      'and a backup space booked ahead.',
    exampleHeading: 'Example: a ₹15,000 outdoor anniversary dinner for 20',
    cta: 'Plan your anniversary',
    tips: [
      'For an outdoor dinner, reserve a tent or an indoor backup and check the forecast three days before.',
      'A smaller guest list lets more of the budget go to food and a setting that feels special.',
      'Collect a few photos or messages from family in advance for a short toast or slideshow.',
      'Book the photographer about two weeks ahead if you want the evening captured.',
      'Prepare a simple run sheet for the evening so the hosts can enjoy it too.',
    ],
    faqs: [
      {
        q: 'How much contingency does an outdoor anniversary dinner need?',
        a:
          'CelebrAI raises contingency from 10% to 15% for an outdoor venue, moving 2.5% each from décor and ' +
          'entertainment, to cover a tent or an indoor backup.',
      },
      {
        q: 'How do I plan a 25th anniversary party?',
        a:
          'Start with the guest list and the venue about a month before, book the caterer three weeks before and send ' +
          'invitations at the same time. The checklist above has every step with its timing.',
      },
      {
        q: 'Can CelebrAI write the invitation?',
        a:
          'Yes. The invitation studio writes formal, friendly, traditional or modern wording that you can edit, copy, ' +
          'or share by WhatsApp or email.',
      },
    ],
    example: OCCASION_EXAMPLES.anniversary,
  },
]
