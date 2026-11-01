# CelebrAI – Product and Development Specification

## 1. Product summary

CelebrAI is a smart Celebration and Event Planner for birthdays, weddings, anniversaries, baby showers, family gatherings, and corporate celebrations.

It combines an AI assistant with deterministic application logic. The AI interprets requirements and proposes a plan; backend services validate budgets, dates, permissions, and structured output.

## 2. Problem statement

Planning an event involves coordinating many connected decisions: guest count, budget, venue, food, theme, schedule, invitations, and preparation tasks. People often use separate tools and struggle to understand the effect of one decision on the others.

CelebrAI aims to make this process easier by creating one editable plan from a user's context.

## 3. Target users and personas

- **Family organizer:** Plans birthdays, anniversaries, and family celebrations with a fixed budget.
- **Couple or family:** Coordinates larger milestone celebrations and multiple tasks.
- **Small business or team organizer:** Plans a small corporate event or team celebration.
- **First-time planner:** Needs guidance and clear explanations rather than expert terminology.

## 4. Product principles

1. Context before recommendations.
2. Ask only useful follow-up questions.
3. Explain why a recommendation was made.
4. Separate estimates from confirmed facts.
5. Keep arithmetic and access control deterministic.
6. Make generated plans editable and persistent.
7. Make the core workflow usable on mobile and desktop.

## 5. MVP scope

### P0 – Required core

- Authentication or clearly isolated demo mode.
- Create, list, view, update, and delete events.
- Event context capture.
- AI conversation and structured plan generation.
- Missing-information handling.
- Budget validation and expense tracking.
- Persisted checklist and timeline.
- Invitation text generation.
- Responsive UI, loading, empty, and error states.
- Security controls and automated tests.

### P1 – Useful enhancements

- Budget optimization modes: save money, improve experience, balanced.
- What-if guest-count and budget simulator.
- Event readiness score based on actual task and risk data.
- Export/share plan.
- Multiple invitation tones.

### Out of scope unless time allows

- Actual vendor booking or payment processing.
- Unverified venue availability.
- WhatsApp or calendar integrations requiring additional permissions.
- Complex collaborative editing.
- AI-generated image studio.

## 6. User journey

1. Visitor opens the landing page.
2. User signs up, logs in, or enters a clearly labelled demo.
3. User creates an event with occasion, date, location, guest count, budget, and preferences.
4. Assistant identifies missing critical details and asks follow-up questions.
5. Assistant generates a structured event plan.
6. Backend validates the plan and recalculates budget totals.
7. User reviews and edits the theme, recommendations, expenses, timeline, and tasks.
8. User saves changes.
9. User returns later and sees persisted data.

## 7. Screens

| Screen | Main responsibilities |
|---|---|
| Landing | Explain product and start planning |
| Authentication | Signup, login, logout |
| Dashboard | Upcoming events, budget summary, active tasks |
| Create event | Capture event requirements |
| AI planner | Conversation, questions, plan generation |
| Event overview | Summary, theme, guests, key decisions |
| Budget | Allocations, estimates, actual expenses, remaining |
| Checklist | Tasks, priorities, due dates, completion |
| Timeline | Preparation schedule and event-day agenda |
| Invitation studio | Edit, preview, and copy invitation text |
| Settings | Profile and account preferences |

## 8. Event context model

```ts
interface EventContext {
  occasion: string;
  eventName: string;
  eventDate: string | null;
  location: string;
  guestCount: number;
  budgetMinor: number;
  currency: string;
  preferences: string[];
  ageGroup?: string;
  venuePreference: "indoor" | "outdoor" | "flexible";
  dietaryRequirements: string[];
  specialRequirements: string;
}
```

Use a documented currency convention. For INR, `budgetMinor` can represent paise; alternatively use integer rupees consistently. Never mix units. Validate safe integer ranges.

## 9. Structured event plan

```ts
interface EventPlan {
  summary: string;
  theme: {
    name: string;
    description: string;
    reasoning: string;
  };
  recommendations: Array<{
    category: string;
    suggestion: string;
    reason: string;
    estimatedCostMinor: number;
  }>;
  budget: Array<{
    category: string;
    amountMinor: number;
    reasoning: string;
  }>;
  checklist: Array<{
    title: string;
    priority: "high" | "medium" | "low";
    dueDate: string | null;
  }>;
  timeline: Array<{
    time: string;
    activity: string;
  }>;
  risks: Array<{
    issue: string;
    mitigation: string;
  }>;
  assumptions: string[];
}
```

Implement the corresponding Zod schema and reject malformed or out-of-range values.

## 10. Decision logic

| Context or condition | Expected application behavior |
|---|---|
| Missing event date | Ask for date before generating date-specific schedule |
| Missing guest count | Ask if guest count materially affects recommendations |
| Low budget | Prioritize essentials and lower-cost options |
| Larger guest count | Recalculate catering and capacity needs |
| Outdoor event | Include a weather/indoor contingency |
| Children attending | Suggest age-appropriate activities and safety considerations |
| Dietary requirements | Highlight them in catering requirements |
| Event is soon | Prioritize urgent tasks and remove unrealistic lead times |
| Budget exceeds target | Show overrun and propose explicit trade-offs |
| Venue capacity is unknown | Flag it as something to verify, not as a confirmed fit |

## 11. Budget engine

Initial example allocation (not market pricing):

| Category | Starting share |
|---|---:|
| Venue | 20% |
| Food and catering | 30% |
| Decoration | 15% |
| Photography | 10% |
| Entertainment | 10% |
| Invitations | 3% |
| Miscellaneous | 2% |
| Contingency | 10% |
| Total | 100% |

These are configurable defaults, not universal rules. A home event may have no venue expense. The AI may propose category changes, but the backend must validate the resulting totals.

Required invariants:
- All amounts are non-negative safe integers in the chosen currency unit.
- The total is calculated by the backend.
- The UI clearly shows remaining amount or overrun.
- Reallocation requires user review.
- Estimated and actual costs are separate.
- Rounding remainder is handled deterministically.

## 12. API outline

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/events` | List current user's events |
| POST | `/api/events` | Create event |
| GET | `/api/events/:id` | Get owned event |
| PATCH | `/api/events/:id` | Update owned event |
| DELETE | `/api/events/:id` | Delete owned event |
| POST | `/api/planner/chat` | Continue AI conversation |
| POST | `/api/planner/generate` | Generate structured plan |
| GET | `/api/events/:id/plan` | Retrieve saved plan |
| PATCH | `/api/events/:id/budget` | Update budget |
| PATCH | `/api/events/:id/tasks/:taskId` | Update task |
| POST | `/api/events/:id/invitation` | Generate invitation text |

All protected routes must authenticate the user and verify ownership. Use consistent response and error formats.

## 13. Database entities

- `profiles`: user profile details.
- `events`: event owner, context, date, location, guest count, budget, status.
- `event_plans`: versioned structured plan JSON.
- `expenses`: category, estimated amount, actual amount.
- `tasks`: title, priority, due date, completion.
- `conversations`: event/user association and bounded conversation history.

Use UUID primary keys, foreign keys, timestamps, indexes, and RLS. Define deletion behavior explicitly. Avoid storing more conversation content than the product needs.

## 14. UX and visual direction

- Warm ivory background, restrained purple primary, coral and gold accents.
- DM Sans for body/UI; optional serif display face for selected headings.
- Clear typography hierarchy and readable contrast.
- Responsive sidebar on desktop and compact navigation on mobile.
- Accessible labels, focus states, keyboard navigation, and reduced-motion support.
- No decorative button that does nothing.
- Loading, error, empty, and success states for every major workflow.

## 15. Success criteria

The MVP is ready for evaluation when a user can:
- Create an account and sign in.
- Create and retrieve an event.
- Provide context and receive relevant follow-up questions.
- Generate a schema-valid plan.
- See correct backend-calculated budget totals.
- Edit and persist tasks and expenses.
- Generate and edit invitation text.
- Use the app on a mobile viewport.
- Access only their own data.

## 16. Known limitations to disclose

- Generated prices are estimates, not vendor quotes.
- Venue and vendor availability is not confirmed without a live integration.
- Weather and traffic are not verified unless connected to a trusted data source.
- AI-generated suggestions require user review.
