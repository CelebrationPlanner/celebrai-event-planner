// Typed client for the CelebrAI API. Attaches the Supabase access token, applies timeouts and
// turns every failure into an ApiError with a user-safe message.
import type {
  ApiErrorBody,
  BudgetSummary,
  CelebrationEvent,
  ChatMessage,
  CurrencyCode,
  EventCreate,
  EventPlan,
  EventUpdate,
  Expense,
  InvitationTone,
  Profile,
  Task,
  TaskCreate,
  TaskUpdate,
} from '@celebrai/shared'
import { ApiError } from './apiError'
import { supabase } from './supabase'

export { ApiError }


const BASE = import.meta.env.VITE_API_BASE_URL
const AI_TIMEOUT_MS = 60_000
const TIMEOUT_MS = 20_000 // generous: a sleeping free-tier backend can take a while to wake (D12)

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = TIMEOUT_MS): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. It may be waking up — please try again in a moment.')
    }
    throw new ApiError(0, 'NETWORK', 'Can’t reach the CelebrAI server. Check your connection and try again.')
  }
  if (res.status === 204) return undefined as T

  const json = (await res.json().catch(() => null)) as ({ data?: T } & Partial<ApiErrorBody>) | null
  if (!res.ok) {
    // An expired or revoked session: sign out locally so protected screens redirect to login.
    if (res.status === 401 && token) await supabase.auth.signOut()
    const error = json?.error
    throw new ApiError(res.status, error?.code ?? 'INTERNAL', error?.message ?? 'Something went wrong. Please try again.', error?.details as ApiError['details'])
  }
  return json?.data as T
}

export interface DashboardData {
  events: Array<CelebrationEvent & { progress: { done: number; total: number } }>
  totals: { upcomingEvents: number; budgetByCurrency: Partial<Record<CurrencyCode, number>>; activeTasks: number; completedTasks: number }
  activity: Array<{ eventId: string; message: string; at: string }>
}
export interface SavedPlan {
  version: number
  plan: EventPlan
  createdAt: string
}
export interface ChatResult {
  event: CelebrationEvent
  reply: string
  questions: string[]
  missing: string[]
  readyToGenerate: boolean
}
export type GenerateResult = { kind: 'clarification'; missing: string[]; questions: string[] } | { kind: 'plan'; reused: boolean; version: number; plan: EventPlan }
export type EventInput = Partial<Omit<EventCreate, 'status'>> & Pick<EventCreate, 'eventName' | 'budgetMinor'>

export const api = {
  dashboard: () => request<DashboardData>('GET', '/dashboard'),
  event: (id: string) => request<CelebrationEvent>('GET', `/events/${id}`),
  createEvent: (input: EventInput) => request<CelebrationEvent>('POST', '/events', input),
  updateEvent: (id: string, patch: EventUpdate) => request<CelebrationEvent>('PATCH', `/events/${id}`, patch),
  deleteEvent: (id: string) => request<void>('DELETE', `/events/${id}`),
  plan: (id: string) => request<SavedPlan | null>('GET', `/events/${id}/plan`),
  budget: (id: string) => request<{ expenses: Expense[]; summary: BudgetSummary }>('GET', `/events/${id}/budget`),
  updateBudget: (id: string, expenses: Array<Pick<Expense, 'category' | 'estimatedMinor' | 'actualMinor'>>) =>
    request<{ expenses: Expense[]; summary: BudgetSummary }>('PATCH', `/events/${id}/budget`, { expenses }),
  tasks: (id: string) => request<Task[]>('GET', `/events/${id}/tasks`),
  createTask: (id: string, input: Partial<TaskCreate> & Pick<TaskCreate, 'title'>) => request<Task>('POST', `/events/${id}/tasks`, input),
  updateTask: (id: string, taskId: string, patch: TaskUpdate) => request<Task>('PATCH', `/events/${id}/tasks/${taskId}`, patch),
  deleteTask: (id: string, taskId: string) => request<void>('DELETE', `/events/${id}/tasks/${taskId}`),
  saveInvitation: (id: string, text: string, tone: InvitationTone) => request<CelebrationEvent>('PATCH', `/events/${id}/invitation`, { text, tone }),
  generateInvitation: (id: string, tone: InvitationTone) => request<{ text: string; tone: InvitationTone }>('POST', `/events/${id}/invitation/generate`, { tone }, AI_TIMEOUT_MS),
  conversation: (id: string) => request<ChatMessage[]>('GET', `/events/${id}/conversation`),
  chat: (message: string, eventId?: string) => request<ChatResult>('POST', '/planner/chat', { message, eventId }, AI_TIMEOUT_MS),
  generatePlan: (eventId: string, regenerate = false) => request<GenerateResult>('POST', '/planner/generate', { eventId, regenerate }, AI_TIMEOUT_MS),
  profile: () => request<Profile>('GET', '/profile'),
  updateProfile: (patch: Partial<Omit<Profile, 'id'>>) => request<Profile>('PATCH', '/profile', patch),
  seedDemo: () => request<{ seeded: boolean; eventId: string }>('POST', '/demo/seed', {}),
}

/** Field-level messages from a 400 response, keyed by field name. */
export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || !err.details) return {}
  return Object.fromEntries(err.details.map((d) => [d.path, d.message]))
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
