// In-memory stand-in for the CelebrAI API and Supabase Auth, used by component tests.
// Budget totals use the same shared summarizeBudget as the real server.
import { addDays, eventPlanSchema, summarizeBudget, type CelebrationEvent, type ChatMessage, type EventPlan, type Expense, type Profile, type Task } from '@celebrai/shared'
import type { Session } from '@supabase/supabase-js'
import type { api as realApi, ChatResult, GenerateResult } from '@/lib/api'
import { ApiError } from '@/lib/apiError'
import { todayISO } from '@/lib/dates'

type Api = typeof realApi
const today = todayISO()
const now = new Date().toISOString()

function event(overrides: Partial<CelebrationEvent> & Pick<CelebrationEvent, 'id' | 'eventName'>): CelebrationEvent {
  return {
    status: 'planning', occasion: 'birthday', eventDate: addDays(today, 12), location: 'Pune', guestCount: 40, budgetMinor: 2_500_000, currency: 'INR',
    venuePreference: 'flexible', themePreferences: ['Princess'], ageGroup: 'Children (under 12)', dietaryRequirements: ['Vegetarian'], additionalInstructions: '',
    invitationText: 'You are invited to a princess party!', invitationTone: 'friendly', createdAt: now, updatedAt: now,
    ...overrides,
  }
}

export const PLAN: EventPlan = eventPlanSchema.parse({
  summary: 'An afternoon princess party for 40 guests in Pune.',
  theme: { name: 'Pastel Princess Garden', description: 'Soft pink and lavender décor.', reasoning: 'She loves princesses.' },
  recommendations: [{ category: 'Venue', recommendation: 'Society clubhouse, 4–7 PM.', explanation: 'Indoor and safe.', reasoning: '40 guests need ~700 sq ft.', estimatedCostMinor: 500_000, assumptions: ['Availability not verified.'] }],
  budget: (['venue', 'food', 'decoration', 'photography', 'entertainment', 'invitations', 'miscellaneous', 'contingency'] as const).map((category) => ({ category, amountMinor: 0, reasoning: 'r' })),
  checklist: [],
  schedule: [{ time: '16:00', activity: 'Guests arrive' }, { time: '17:30', activity: 'Cake cutting' }],
  risks: [{ issue: 'Bad weather (rain, heat or wind) on the day.', mitigation: 'Reserve an indoor backup.' }],
  assumptions: ['All costs are estimates based on typical prices, not vendor quotations.'],
  decisions: [{ rule: 'Children attending', detail: 'Activities are kept short and age-appropriate.' }],
  contextHash: 'a'.repeat(64),
  generatedAt: now,
})

function initialState() {
  const events = [
    event({ id: 'evt-birthday', eventName: "Anaya's 5th Birthday" }),
    event({ id: 'evt-anniversary', eventName: "Rohan & Meera's 10th Anniversary", occasion: 'anniversary', eventDate: addDays(today, 30), guestCount: 20, budgetMinor: 1_500_000, invitationText: '' }),
  ]
  const expenses: Expense[] = (
    [['venue', 500_000], ['food', 800_000], ['decoration', 400_000], ['photography', 200_000], ['entertainment', 300_000], ['invitations', 50_000], ['miscellaneous', 50_000], ['contingency', 200_000]] as const
  ).map(([category, estimatedMinor]) => ({ id: `exp-${category}`, eventId: 'evt-birthday', category, estimatedMinor, actualMinor: null }))
  const tasks: Task[] = [
    ['Book the venue', 'high', 2, true],
    ['Book magician or game host', 'high', 3, false],
    ['Send invitations', 'high', 4, false],
    ['Confirm caterer', 'medium', 6, false],
  ].map(([title, priority, offset, completed], i) => ({
    id: `task-${i}`, eventId: 'evt-birthday', title: title as string, priority: priority as Task['priority'], dueDate: addDays(today, offset as number),
    completed: completed as boolean, kind: 'preparation', createdAt: now, updatedAt: now,
  }))
  return {
    events,
    expenses,
    tasks,
    plans: new Map<string, { version: number; plan: EventPlan; createdAt: string }>([['evt-birthday', { version: 1, plan: PLAN, createdAt: now }]]),
    conversations: new Map<string, ChatMessage[]>(),
    profile: { id: 'user-1', displayName: 'Priya', timeZone: 'Asia/Kolkata', defaultCurrency: 'INR' } as Profile,
    // AI is off by default, exactly like a server without GEMINI_API_KEY.
    generateResult: null as GenerateResult | null,
    chatResult: null as ((message: string, event: CelebrationEvent) => Omit<ChatResult, 'event'>) | null,
  }
}

export let db = initialState()
const aiUnavailable = () => new ApiError(503, 'AI_UNAVAILABLE', 'The AI planner is unavailable right now. Please try again shortly.')
const notFound = () => new ApiError(404, 'NOT_FOUND', 'Event not found.')
const find = (id: string) => db.events.find((e) => e.id === id) ?? (() => { throw notFound() })()
const budgetView = (id: string) => {
  const expenses = db.expenses.filter((x) => x.eventId === id)
  return { expenses, summary: summarizeBudget(find(id).budgetMinor, expenses) }
}

const api: Api = {
  dashboard: async () => ({
    events: db.events.map((e) => {
      const own = db.tasks.filter((t) => t.eventId === e.id)
      return { ...e, progress: { done: own.filter((t) => t.completed).length, total: own.length } }
    }),
    totals: {
      upcomingEvents: db.events.length,
      budgetByCurrency: db.events.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.currency]: (acc[e.currency] ?? 0) + e.budgetMinor }), {}),
      activeTasks: db.tasks.filter((t) => !t.completed).length,
      completedTasks: db.tasks.filter((t) => t.completed).length,
    },
    activity: db.tasks.filter((t) => t.completed).map((t) => ({ eventId: t.eventId, message: `Completed “${t.title}”`, at: now })),
  }),
  event: async (id) => find(id),
  createEvent: async (input) => {
    const created = event({ ...input, id: `evt-${db.events.length + 1}`, status: input.occasion ? 'planning' : 'draft', invitationText: '' })
    db.events.push(created)
    return created
  },
  updateEvent: async (id, patch) => Object.assign(find(id), patch),
  deleteEvent: async (id) => {
    find(id)
    db.events = db.events.filter((e) => e.id !== id)
  },
  plan: async (id) => (find(id), db.plans.get(id) ?? null),
  budget: async (id) => budgetView(id),
  updateBudget: async (id, lines) => {
    for (const line of lines) {
      const existing = db.expenses.find((x) => x.eventId === id && x.category === line.category)
      if (existing) Object.assign(existing, line)
      else db.expenses.push({ ...line, id: `exp-${line.category}-${id}`, eventId: id })
    }
    return budgetView(id)
  },
  tasks: async (id) => (find(id), db.tasks.filter((t) => t.eventId === id)),
  createTask: async (id, input) => {
    const task: Task = { priority: 'medium', dueDate: null, kind: 'preparation', ...input, id: `task-${crypto.randomUUID()}`, eventId: id, completed: false, createdAt: now, updatedAt: now }
    db.tasks.push(task)
    return task
  },
  updateTask: async (_id, taskId, patch) => Object.assign(db.tasks.find((t) => t.id === taskId)!, patch),
  deleteTask: async (_id, taskId) => {
    db.tasks = db.tasks.filter((t) => t.id !== taskId)
  },
  saveInvitation: async (id, text, tone) => Object.assign(find(id), { invitationText: text, invitationTone: tone }),
  generateInvitation: async () => Promise.reject(aiUnavailable()),
  conversation: async (id) => db.conversations.get(id) ?? [],
  chat: async (message, eventId) => {
    if (!db.chatResult) throw aiUnavailable()
    const target = eventId ? find(eventId) : await api.createEvent({ eventName: 'New celebration', budgetMinor: 0 })
    const result = db.chatResult(message, target)
    db.conversations.set(target.id, [...(db.conversations.get(target.id) ?? []), { role: 'user', content: message, at: now }, { role: 'assistant', content: result.reply, at: now }])
    return { ...result, event: target }
  },
  generatePlan: async () => {
    if (!db.generateResult) throw aiUnavailable()
    return db.generateResult
  },
  profile: async () => db.profile,
  updateProfile: async (patch) => Object.assign(db.profile, patch),
  seedDemo: async () => ({ seeded: true, eventId: 'evt-birthday' }),
}

/** Like a real network response, every call returns a fresh copy (never live references). */
export const fakeApi = Object.fromEntries(
  Object.entries(api).map(([name, fn]) => [name, async (...args: unknown[]) => structuredClone(await (fn as (...a: unknown[]) => Promise<unknown>)(...args))]),
) as Api

// --- Supabase Auth -------------------------------------------------------------------------

type Listener = (event: string, session: Session | null) => void
const listeners = new Set<Listener>()
export const auth = {
  session: null as Session | null,
  set(session: Session | null) {
    auth.session = session
    listeners.forEach((l) => l(session ? 'SIGNED_IN' : 'SIGNED_OUT', session))
  },
}

export const makeSession = (overrides: { anonymous?: boolean } = {}) =>
  ({ access_token: 'test-token', user: { id: 'user-1', email: 'priya@example.com', is_anonymous: overrides.anonymous ?? false, user_metadata: { display_name: 'Priya' } } }) as unknown as Session

export const fakeSupabase = {
  auth: {
    getSession: async () => ({ data: { session: auth.session } }),
    onAuthStateChange: (listener: Listener) => {
      listeners.add(listener)
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } }
    },
    signInWithPassword: async ({ password }: { email: string; password: string }) => {
      if (password !== 'correct-password') return { data: {}, error: { message: 'Invalid login credentials' } }
      auth.set(makeSession())
      return { data: { session: auth.session }, error: null }
    },
    signUp: async () => {
      auth.set(makeSession())
      return { data: { session: auth.session }, error: null }
    },
    updateUser: async () => ({ data: { user: auth.session?.user }, error: null }),
    signInAnonymously: async () => {
      auth.set(makeSession({ anonymous: true }))
      return { data: { session: auth.session }, error: null }
    },
    signOut: async () => auth.set(null),
  },
}

export function resetFakes(session: Session | null) {
  db = initialState()
  listeners.clear()
  auth.session = session
}
