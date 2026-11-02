// Phase 7 security fixes, against the real local stack with a scripted AI provider.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AIProvider } from './ai/provider.ts'
import type { AiChat } from './ai/schemas.ts'
import { createApp } from './app.ts'
import { client, deleteUsers, makeAnonUser, makeUser, testEnv, type TestUser } from './test/integration.ts'

const empty: AiChat['extracted'] = {
  occasion: null,
  eventName: null,
  eventDate: null,
  location: null,
  guestCount: null,
  budgetAmount: null,
  currency: null,
  venuePreference: null,
  themePreferences: [],
  ageGroup: null,
  dietaryRequirements: [],
  additionalInstructions: null,
}
let calls = 0
const ai: AIProvider = { name: 'fake', generateJson: async () => (calls++, { reply: 'Noted.', extracted: empty }) }

let alice: TestUser
let bob: TestUser
const anons: TestUser[] = []

beforeAll(async () => {
  ;[alice, bob] = await Promise.all([makeUser('sec-alice'), makeUser('sec-bob')])
  for (let i = 0; i < 3; i++) anons.push(await makeAnonUser())
})
afterAll(() => deleteUsers([alice, bob, ...anons]))

describe('database enforces the limits the API relies on', () => {
  it('rejects oversized tags written directly through the Data API (prompt inflation)', async () => {
    const id = (
      await client(createApp(testEnv()), alice).post('/events', {
        occasion: 'birthday',
        eventName: 'Direct write',
        budgetMinor: 100,
      })
    ).body.data.id
    const { error } = await alice.db
      .from('events')
      .update({ theme_preferences: ['x'.repeat(5000)] })
      .eq('id', id)
    expect(error?.code).toBe('23514') // check_violation
    const ok = await alice.db
      .from('events')
      .update({ dietary_requirements: ['Vegan'] })
      .eq('id', id)
    expect(ok.error).toBeNull()
  })
})

describe('AI spend limits', () => {
  it('gives anonymous demo users a smaller daily AI quota than accounts', async () => {
    const app = createApp(testEnv({ AI_DAILY_LIMIT_PER_USER: '3', AI_DAILY_LIMIT_ANONYMOUS: '1' }), { ai })
    expect((await client(app, anons[0]).post('/planner/chat', { message: 'one' })).status).toBe(200)
    const blocked = await client(app, anons[0]).post('/planner/chat', { message: 'two' })
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.message).toMatch(/today’s AI planning limit/)
    for (const m of ['a', 'b', 'c'])
      expect((await client(app, alice).post('/planner/chat', { message: m })).status).toBe(200)
    expect((await client(app, alice).post('/planner/chat', { message: 'd' })).status).toBe(429)
  })

  it('caps AI calls per IP so minting anonymous users does not multiply the limit', async () => {
    const app = createApp(testEnv({ AI_RATE_LIMIT_PER_IP: '2' }), { ai })
    expect((await client(app, anons[1]).post('/planner/chat', { message: 'x' })).status).toBe(200)
    expect((await client(app, anons[2]).post('/planner/chat', { message: 'x' })).status).toBe(200)
    expect((await client(app, bob).post('/planner/chat', { message: 'x' })).status).toBe(429) // same IP, third identity
  })

  it('stops all AI calls once the global daily budget is used', async () => {
    const app = createApp(testEnv({ AI_DAILY_LIMIT_TOTAL: '2' }), { ai })
    await client(app, alice).post('/planner/chat', { message: 'x' })
    await client(app, bob).post('/planner/chat', { message: 'x' })
    const before = calls
    const res = await client(app, anons[1]).post('/planner/chat', { message: 'x' })
    expect(res.status).toBe(503)
    expect(res.body.error.code).toBe('AI_UNAVAILABLE')
    expect(calls).toBe(before) // the provider was not called
  })
})

describe('defensive handling of stored values', () => {
  it('keeps working when a user stores an invalid time zone directly', async () => {
    const { error } = await bob.db.from('profiles').update({ time_zone: 'Not/AZone' }).eq('id', bob.id)
    expect(error).toBeNull()
    const res = await client(createApp(testEnv()), bob).post('/events', {
      occasion: 'family',
      eventName: 'Still works',
      budgetMinor: 100,
    })
    expect(res.status).toBe(201)
  })
})
