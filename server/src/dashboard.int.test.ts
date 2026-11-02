import { addDays, eventPlanSchema, todayInTimeZone } from '@celebrai/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { client, deleteUsers, makeAnonUser, makeUser, testEnv, type TestUser } from './test/integration.ts'

const app = createApp(testEnv())
const today = todayInTimeZone('Asia/Kolkata')
let user: TestUser
let demo: TestUser

beforeAll(async () => {
  ;[user, demo] = await Promise.all([makeUser('dash'), makeAnonUser()])
})
afterAll(() => deleteUsers([user, demo]))

describe('GET /dashboard', () => {
  it('returns empty totals for a new user', async () => {
    const res = await client(app, user).get('/dashboard')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({
      events: [],
      totals: { upcomingEvents: 0, budgetByCurrency: {}, activeTasks: 0, completedTasks: 0 },
      activity: [],
    })
  })

  it('aggregates events, task progress, budgets and activity in one call', async () => {
    const api = client(app, user)
    const a = (
      await api.post('/events', {
        occasion: 'birthday',
        eventName: 'A',
        eventDate: addDays(today, 5),
        budgetMinor: 1_000_000,
      })
    ).body.data.id
    await api.post('/events', { occasion: 'festival', eventName: 'B', budgetMinor: 500_000, currency: 'USD' })
    const t1 = (await api.post(`/events/${a}/tasks`, { title: 'First task' })).body.data.id
    await api.post(`/events/${a}/tasks`, { title: 'Second task' })
    await api.patch(`/events/${a}/tasks/${t1}`, { completed: true })

    const { data } = (await api.get('/dashboard')).body
    expect(data.totals).toEqual({
      upcomingEvents: 2,
      budgetByCurrency: { INR: 1_000_000, USD: 500_000 },
      activeTasks: 1,
      completedTasks: 1,
    })
    expect(data.events.find((e: { id: string }) => e.id === a).progress).toEqual({ done: 1, total: 2 })
    expect(data.activity[0].message).toBe('Completed “First task”')
  })
})

describe('POST /demo/seed', () => {
  it('refuses to add sample data to a real account', async () => {
    const res = await client(app, user).post('/demo/seed', {})
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('seeds one sample event with an engine-built, schema-valid plan — once', async () => {
    const api = client(app, demo)
    const first = await api.post('/demo/seed', {})
    expect(first.status).toBe(201)
    const { eventId } = first.body.data

    const event = (await api.get(`/events/${eventId}`)).body.data
    expect(event).toMatchObject({
      eventName: "Anaya's 5th Birthday (sample)",
      status: 'planning',
      budgetMinor: 2_500_000,
    })

    const plan = (await api.get(`/events/${eventId}/plan`)).body.data
    expect(eventPlanSchema.safeParse(plan.plan).success).toBe(true)
    expect(plan.plan.summary).toMatch(/^Sample plan/)
    expect(plan.plan.decisions.map((d: { rule: string }) => d.rule)).toEqual(
      expect.arrayContaining(['Children attending', 'Short notice', 'Dietary requirements']),
    )

    const budget = (await api.get(`/events/${eventId}/budget`)).body.data
    expect(budget.summary).toMatchObject({ estimatedMinor: 2_500_000, overrunMinor: 0 })
    expect((await api.get(`/events/${eventId}/tasks`)).body.data.length).toBeGreaterThan(8)
    expect((await api.get(`/events/${eventId}/conversation`)).body.data).toHaveLength(2)

    const again = await api.post('/demo/seed', {})
    expect(again.body.data).toEqual({ seeded: false, eventId })
    expect((await api.get('/events')).body.total).toBe(1)
  })

  it('keeps demo data isolated from other users', async () => {
    const demoEvent = (await client(app, demo).get('/events')).body.data[0].id
    expect((await client(app, user).get(`/events/${demoEvent}`)).status).toBe(404)
  })
})
