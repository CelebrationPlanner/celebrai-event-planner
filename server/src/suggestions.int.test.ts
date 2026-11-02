// Phase 6: engine suggestions (no AI), bulk task creation and editing the event-day schedule.
import { addDays, eventPlanSchema, todayInTimeZone } from '@celebrai/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { client, deleteUsers, makeAnonUser, makeUser, testEnv, type TestUser } from './test/integration.ts'

const app = createApp(testEnv()) // no AI provider configured: none of these routes may need it
const today = todayInTimeZone('Asia/Kolkata')
let alice: TestUser
let bob: TestUser
let demo: TestUser
let eventId: string

beforeAll(async () => {
  ;[alice, bob, demo] = await Promise.all([makeUser('sugg-alice'), makeUser('sugg-bob'), makeAnonUser()])
  eventId = (
    await client(app, alice).post('/events', {
      occasion: 'birthday',
      eventName: 'Garden party',
      eventDate: addDays(today, 10),
      guestCount: 50,
      budgetMinor: 3_000_000,
      venuePreference: 'outdoor',
    })
  ).body.data.id
})
afterAll(() => deleteUsers([alice, bob, demo]))

describe('GET /events/:id/suggestions (engine only, nothing saved)', () => {
  it('returns an exact budget split, realistic tasks and the rules applied', async () => {
    const res = await client(app, alice).get(`/events/${eventId}/suggestions`)
    expect(res.status).toBe(200)
    const { budget, tasks, decisions, missing } = res.body.data
    expect(missing).toEqual([])
    expect(budget.reduce((s: number, b: { amountMinor: number }) => s + b.amountMinor, 0)).toBe(3_000_000)
    expect(decisions.map((d: { rule: string }) => d.rule)).toEqual(
      expect.arrayContaining(['Outdoor venue', 'Short notice']),
    )
    for (const t of tasks) expect(t.dueDate >= today && t.dueDate <= addDays(today, 10), t.title).toBe(true)

    expect((await client(app, alice).get(`/events/${eventId}/budget`)).body.data.expenses).toEqual([])
    expect((await client(app, alice).get(`/events/${eventId}/tasks`)).body.data).toEqual([])
  })

  it('reports missing details and offers no split without a budget', async () => {
    const draft = (await client(app, alice).post('/events', { eventName: 'Undecided', budgetMinor: 0 })).body.data.id
    const { data } = (await client(app, alice).get(`/events/${draft}/suggestions`)).body
    expect(data.budget).toEqual([])
    expect(data.missing.map((m: { field: string }) => m.field)).toEqual([
      'occasion',
      'eventDate',
      'guestCount',
      'budgetMinor',
    ])
    expect(data.tasks.every((t: { dueDate: string | null }) => t.dueDate === null)).toBe(true)
  })

  it('is private to the event owner', async () => {
    expect((await client(app, bob).get(`/events/${eventId}/suggestions`)).status).toBe(404)
  })
})

describe('POST /events/:id/tasks/bulk', () => {
  it('adds accepted suggestions in one request', async () => {
    const res = await client(app, alice).post(`/events/${eventId}/tasks/bulk`, {
      tasks: [
        { title: 'Book the venue', priority: 'high', dueDate: addDays(today, 2), kind: 'vendor' },
        { title: 'Send invitations', kind: 'invitation' },
      ],
    })
    expect(res.status).toBe(201)
    expect(res.body.data.map((t: { title: string }) => t.title)).toEqual(['Book the venue', 'Send invitations'])
    expect((await client(app, alice).get(`/events/${eventId}/tasks`)).body.data).toHaveLength(2)
  })

  it('is all-or-nothing: one bad deadline rejects the batch', async () => {
    const before = (await client(app, alice).get(`/events/${eventId}/tasks`)).body.data.length
    const res = await client(app, alice).post(`/events/${eventId}/tasks/bulk`, {
      tasks: [{ title: 'Fine task' }, { title: 'After the event', dueDate: addDays(today, 40) }],
    })
    expect(res.status).toBe(400)
    expect(res.body.error.details[0].path).toBe('tasks.1.dueDate')
    expect((await client(app, alice).get(`/events/${eventId}/tasks`)).body.data).toHaveLength(before)
  })

  it('rejects oversized batches and other users', async () => {
    const tooMany = Array.from({ length: 31 }, (_, i) => ({ title: `Task ${i}` }))
    expect((await client(app, alice).post(`/events/${eventId}/tasks/bulk`, { tasks: tooMany })).status).toBe(400)
    expect(
      (await client(app, bob).post(`/events/${eventId}/tasks/bulk`, { tasks: [{ title: 'Sneaky' }] })).status,
    ).toBe(404)
  })
})

describe('PUT /events/:id/plan/schedule (plan editing)', () => {
  let demoEvent: string

  beforeAll(async () => {
    demoEvent = (await client(app, demo).post('/demo/seed', {})).body.data.eventId
  })

  it('saves the edited agenda as a new, sorted, schema-valid plan version', async () => {
    const res = await client(app, demo).put(`/events/${demoEvent}/plan/schedule`, {
      schedule: [
        { time: '18:00', activity: 'Cake' },
        { time: '15:30', activity: 'Doors open' },
      ],
    })
    expect(res.status).toBe(200)
    expect(res.body.data.version).toBe(2)
    expect(res.body.data.plan.schedule).toEqual([
      { time: '15:30', activity: 'Doors open' },
      { time: '18:00', activity: 'Cake' },
    ])
    expect(eventPlanSchema.safeParse(res.body.data.plan).success).toBe(true)
  })

  it('keeps the edit when generating again without changes (no AI call needed)', async () => {
    const res = await client(app, demo).post('/planner/generate', { eventId: demoEvent })
    expect(res.body.data).toMatchObject({ kind: 'plan', reused: true, version: 2 })
    expect(res.body.data.plan.schedule[0].activity).toBe('Doors open')
  })

  it('validates times and requires an existing plan', async () => {
    expect(
      (
        await client(app, demo).put(`/events/${demoEvent}/plan/schedule`, {
          schedule: [{ time: '4 PM', activity: 'x' }],
        })
      ).status,
    ).toBe(400)
    const res = await client(app, alice).put(`/events/${eventId}/plan/schedule`, { schedule: [] })
    expect(res.status).toBe(404)
    expect(res.body.error.message).toBe('Plan not found.')
    expect((await client(app, bob).put(`/events/${demoEvent}/plan/schedule`, { schedule: [] })).status).toBe(404)
  })
})
