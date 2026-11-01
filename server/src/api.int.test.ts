// Integration tests against a real local Supabase (Postgres + Auth + RLS) with two real users.
// Run with `npm run test:integration -w server` after `npx supabase start`.
import { addDays, todayInTimeZone } from '@celebrai/shared'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { loadEnv } from './config/env.ts'
import type { Database } from './db/database.types.ts'

const { SUPABASE_URL = '', SUPABASE_ANON_KEY = '', SUPABASE_SERVICE_ROLE_KEY = '' } = process.env
const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
const app = createApp(loadEnv({ NODE_ENV: 'test', CLIENT_URL: 'http://localhost:5173', SUPABASE_URL, SUPABASE_ANON_KEY, API_RATE_LIMIT_MAX_REQUESTS: '10000' }))
const admin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: noSession })
const today = todayInTimeZone('Asia/Kolkata')

interface TestUser {
  id: string
  token: string
  db: SupabaseClient<Database>
}

async function makeUser(label: string): Promise<TestUser> {
  const email = `${label}-${crypto.randomUUID()}@celebrai.test`
  const password = `pw-${crypto.randomUUID()}`
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error) throw created.error
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: noSession })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw error ?? new Error('no session')
  const db = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: noSession, global: { headers: { Authorization: `Bearer ${data.session.access_token}` } } })
  return { id: data.user.id, token: data.session.access_token, db }
}

const api = (user: TestUser) => ({
  get: (path: string) => request(app).get(`/api${path}`).set('Authorization', `Bearer ${user.token}`),
  post: (path: string, body: object) => request(app).post(`/api${path}`).set('Authorization', `Bearer ${user.token}`).send(body),
  patch: (path: string, body: object) => request(app).patch(`/api${path}`).set('Authorization', `Bearer ${user.token}`).send(body),
  delete: (path: string) => request(app).delete(`/api${path}`).set('Authorization', `Bearer ${user.token}`),
})

let alice: TestUser
let bob: TestUser
let aliceEventId: string
let aliceTaskId: string

beforeAll(async () => {
  ;[alice, bob] = await Promise.all([makeUser('alice'), makeUser('bob')])
  const created = await api(alice).post('/events', {
    occasion: 'birthday',
    eventName: 'Scenario 1 birthday',
    eventDate: addDays(today, 10),
    location: 'Pune',
    guestCount: 50,
    budgetMinor: 3_000_000,
    venuePreference: 'outdoor',
  })
  aliceEventId = created.body.data.id
  aliceTaskId = (await api(alice).post(`/events/${aliceEventId}/tasks`, { title: 'Book venue', priority: 'high', dueDate: addDays(today, 2) })).body.data.id
})

afterAll(async () => {
  // Deleting the users cascades to every row they own.
  await Promise.all([alice, bob].filter(Boolean).map((u) => admin.auth.admin.deleteUser(u.id)))
})

describe('authentication', () => {
  it('creates a profile for every new user (trigger)', async () => {
    const res = await api(alice).get('/profile')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: alice.id, timeZone: 'Asia/Kolkata', defaultCurrency: 'INR' })
  })

  it('rejects a well-formed token with a forged signature (AUTH-04)', async () => {
    const [header, payload] = alice.token.split('.')
    const res = await request(app).get('/api/events').set('Authorization', `Bearer ${header}.${payload}.forged-signature`)
    expect(res.status).toBe(401)
  })
})

describe('events (EVT-01, EVT-02, EVT-04)', () => {
  it('persists and returns the event with backend-owned fields', async () => {
    const res = await api(alice).get(`/events/${aliceEventId}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: aliceEventId, status: 'planning', guestCount: 50, budgetMinor: 3_000_000, currency: 'INR', venuePreference: 'outdoor' })
  })

  it('lists only the caller’s events with pagination metadata', async () => {
    const res = await api(alice).get('/events?limit=5')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ total: 1, limit: 5, offset: 0 })
    expect((await api(bob).get('/events')).body.total).toBe(0)
  })

  it('rejects invalid guest counts, past dates and unknown fields', async () => {
    const bad = await api(alice).post('/events', { occasion: 'birthday', eventName: 'X', budgetMinor: 1, guestCount: 0 })
    expect(bad.status).toBe(400)
    expect(bad.body.error.details[0].path).toBe('guestCount')

    const past = await api(alice).post('/events', { occasion: 'birthday', eventName: 'X', budgetMinor: 1, eventDate: addDays(today, -1) })
    expect(past.status).toBe(400)
    expect(past.body.error.details[0].path).toBe('eventDate')

    const injected = await api(alice).post('/events', { eventName: 'X', budgetMinor: 1, userId: bob.id })
    expect(injected.status).toBe(400)
  })

  it('allows drafts without an occasion but not planning events', async () => {
    const draft = await api(alice).post('/events', { eventName: 'Something in Pune', budgetMinor: 1_000_000 })
    expect(draft.status).toBe(201)
    expect(draft.body.data).toMatchObject({ status: 'draft', occasion: null, eventDate: null, guestCount: null })
    const promote = await api(alice).patch(`/events/${draft.body.data.id}`, { status: 'planning' })
    expect(promote.status).toBe(400)
    expect(promote.body.error.details[0].path).toBe('occasion')
    expect((await api(alice).delete(`/events/${draft.body.data.id}`)).status).toBe(204)
  })

  it('saves the invitation text and tone', async () => {
    const res = await api(alice).patch(`/events/${aliceEventId}/invitation`, { text: 'You are invited!', tone: 'modern' })
    expect(res.status).toBe(200)
    expect((await api(alice).get(`/events/${aliceEventId}`)).body.data).toMatchObject({ invitationText: 'You are invited!', invitationTone: 'modern' })
  })

  it('returns null when no plan has been generated yet', async () => {
    const res = await api(alice).get(`/events/${aliceEventId}/plan`)
    expect(res.status).toBe(200)
    expect(res.body.data).toBeNull()
  })
})

describe('cross-user isolation (Scenario 10 / EVT-03)', () => {
  it('hides another user’s event and every child resource behind 404', async () => {
    for (const path of [`/events/${aliceEventId}`, `/events/${aliceEventId}/tasks`, `/events/${aliceEventId}/budget`, `/events/${aliceEventId}/plan`]) {
      const res = await api(bob).get(path)
      expect(res.status, path).toBe(404)
      expect(JSON.stringify(res.body)).not.toContain('Scenario 1')
    }
  })

  it('blocks writes and deletes on another user’s data', async () => {
    expect((await api(bob).patch(`/events/${aliceEventId}`, { eventName: 'Hijacked' })).status).toBe(404)
    expect((await api(bob).patch(`/events/${aliceEventId}/invitation`, { text: 'x', tone: 'formal' })).status).toBe(404)
    expect((await api(bob).patch(`/events/${aliceEventId}/budget`, { expenses: [{ category: 'food', estimatedMinor: 1, actualMinor: null }] })).status).toBe(404)
    expect((await api(bob).post(`/events/${aliceEventId}/tasks`, { title: 'Sneaky task' })).status).toBe(404)
    expect((await api(bob).patch(`/events/${aliceEventId}/tasks/${aliceTaskId}`, { completed: true })).status).toBe(404)
    expect((await api(bob).delete(`/events/${aliceEventId}/tasks/${aliceTaskId}`)).status).toBe(404)
    expect((await api(bob).delete(`/events/${aliceEventId}`)).status).toBe(404)

    // Bob can't reach Alice's task through his own event either.
    const bobEvent = (await api(bob).post('/events', { occasion: 'family', eventName: 'Bob event', budgetMinor: 100 })).body.data.id
    expect((await api(bob).patch(`/events/${bobEvent}/tasks/${aliceTaskId}`, { completed: true })).status).toBe(404)

    const after = await api(alice).get(`/events/${aliceEventId}`)
    expect(after.body.data.eventName).toBe('Scenario 1 birthday')
    expect((await api(alice).get(`/events/${aliceEventId}/tasks`)).body.data[0]).toMatchObject({ title: 'Book venue', completed: false })
  })

  it('treats malformed ids as not found', async () => {
    expect((await api(alice).get('/events/not-a-uuid')).status).toBe(404)
  })
})

describe('database-level protection (RLS + composite foreign keys)', () => {
  it('RLS hides other users’ rows even from direct table queries', async () => {
    const { data, error } = await bob.db.from('events').select('id, event_name')
    expect(error).toBeNull()
    expect(data?.some((e) => e.id === aliceEventId)).toBe(false)
    expect((await bob.db.from('tasks').select('id').eq('event_id', aliceEventId)).data).toEqual([])
  })

  it('refuses to attach rows to another user’s event', async () => {
    const asBob = await bob.db.from('tasks').insert({ event_id: aliceEventId, user_id: bob.id, title: 'FK attack' })
    expect(asBob.error).not.toBeNull() // composite FK: (event_id, bob) has no matching event
    const asAlice = await bob.db.from('tasks').insert({ event_id: aliceEventId, user_id: alice.id, title: 'RLS attack' })
    expect(asAlice.error).not.toBeNull() // RLS: user_id must equal auth.uid()
  })

  it('gives the anonymous (signed-out) role no table access', async () => {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: noSession })
    const { data, error } = await anon.from('events').select('id')
    expect(error !== null || data?.length === 0).toBe(true)
  })
})

describe('budget (BUD-01..04, Scenario 9)', () => {
  it('reports an exact overrun and never changes the budget (₹20,000 vs ₹24,000)', async () => {
    const id = (await api(alice).post('/events', { occasion: 'birthday', eventName: 'Overrun', budgetMinor: 2_000_000 })).body.data.id
    const res = await api(alice).patch(`/events/${id}/budget`, {
      expenses: [
        { category: 'venue', estimatedMinor: 1_500_000, actualMinor: null },
        { category: 'food', estimatedMinor: 900_000, actualMinor: 100_000 },
      ],
    })
    expect(res.status).toBe(200)
    expect(res.body.data.summary).toMatchObject({ budgetMinor: 2_000_000, estimatedMinor: 2_400_000, actualMinor: 100_000, overrunMinor: 400_000, remainingMinor: 0 })
    expect((await api(alice).get(`/events/${id}`)).body.data.budgetMinor).toBe(2_000_000)

    // Upsert by category: editing food replaces the row instead of duplicating it.
    const edited = await api(alice).patch(`/events/${id}/budget`, { expenses: [{ category: 'food', estimatedMinor: 500_000, actualMinor: 100_000 }] })
    expect(edited.body.data.expenses).toHaveLength(2)
    expect(edited.body.data.summary).toMatchObject({ estimatedMinor: 2_000_000, overrunMinor: 0, remainingMinor: 0 })
  })

  it('rejects negative, fractional, unsafe and duplicate amounts', async () => {
    const path = `/events/${aliceEventId}/budget`
    for (const expenses of [
      [{ category: 'food', estimatedMinor: -1, actualMinor: null }],
      [{ category: 'food', estimatedMinor: 10.5, actualMinor: null }],
      [{ category: 'food', estimatedMinor: Number.MAX_SAFE_INTEGER + 2, actualMinor: null }],
      [{ category: 'food', estimatedMinor: 1, actualMinor: null }, { category: 'food', estimatedMinor: 2, actualMinor: null }],
    ]) {
      expect((await api(alice).patch(path, { expenses })).status).toBe(400)
    }
  })
})

describe('tasks (TASK-01)', () => {
  it('persists completion', async () => {
    expect((await api(alice).patch(`/events/${aliceEventId}/tasks/${aliceTaskId}`, { completed: true })).status).toBe(200)
    expect((await api(alice).get(`/events/${aliceEventId}/tasks`)).body.data[0].completed).toBe(true)
  })

  it('rejects past deadlines and deadlines after the event', async () => {
    const path = `/events/${aliceEventId}/tasks`
    expect((await api(alice).post(path, { title: 'Too late', dueDate: addDays(today, 30) })).body.error.message).toBe('The due date must be on or before the event date.')
    expect((await api(alice).post(path, { title: 'In the past', dueDate: addDays(today, -1) })).status).toBe(400)
  })

  it('deletes a task once', async () => {
    const id = (await api(alice).post(`/events/${aliceEventId}/tasks`, { title: 'Temporary' })).body.data.id
    expect((await api(alice).delete(`/events/${aliceEventId}/tasks/${id}`)).status).toBe(204)
    expect((await api(alice).delete(`/events/${aliceEventId}/tasks/${id}`)).status).toBe(404)
  })

  it('deleting an event cascades to its tasks', async () => {
    const id = (await api(alice).post('/events', { occasion: 'festival', eventName: 'Cascade', budgetMinor: 100 })).body.data.id
    await api(alice).post(`/events/${id}/tasks`, { title: 'Child task' })
    expect((await api(alice).delete(`/events/${id}`)).status).toBe(204)
    const { count } = await admin.from('tasks').select('id', { count: 'exact', head: true }).eq('event_id', id)
    expect(count).toBe(0)
  })
})
