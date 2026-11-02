import {
  eventCreateSchema,
  eventPlanSchema,
  eventUpdateSchema,
  invitationSchema,
  paginationSchema,
  scheduleUpdateSchema,
  type EventUpdate,
} from '@celebrai/shared'
import { Router } from 'express'
import type { Database } from '../db/database.types.ts'
import { toEvent } from '../db/mappers.ts'
import { invalid, notFound, unwrap, unwrapMaybe } from '../lib/errors.ts'
import { getAuth } from '../middleware/auth.ts'
import { assertNotPast, loadOwnedEvent, parseId, userToday } from './ownership.ts'

type EventPatch = Database['public']['Tables']['events']['Update']

export const toColumns = (e: EventUpdate): EventPatch => ({
  status: e.status,
  occasion: e.occasion,
  event_name: e.eventName,
  event_date: e.eventDate,
  location: e.location,
  guest_count: e.guestCount,
  budget_minor: e.budgetMinor,
  currency: e.currency,
  venue_preference: e.venuePreference,
  theme_preferences: e.themePreferences,
  age_group: e.ageGroup,
  dietary_requirements: e.dietaryRequirements,
  additional_instructions: e.additionalInstructions,
})

export const eventsRouter = Router()

eventsRouter.get('/events', async (req, res) => {
  const { db, userId } = getAuth(req)
  const { limit, offset } = paginationSchema.parse(req.query)
  const { data, count, error } = await db
    .from('events')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('event_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  res.json({ data: unwrap({ data, error }).map(toEvent), total: count ?? 0, limit, offset })
})

eventsRouter.post('/events', async (req, res) => {
  const { db, userId } = getAuth(req)
  const input = eventCreateSchema.parse(req.body)
  assertNotPast(input.eventDate, await userToday(db, userId), 'eventDate')
  const row = unwrap(
    await db
      .from('events')
      .insert({ ...toColumns(input), event_name: input.eventName, budget_minor: input.budgetMinor, user_id: userId })
      .select()
      .single(),
  )
  res.status(201).json({ data: toEvent(row) })
})

eventsRouter.get('/events/:id', async (req, res) => {
  const { db, userId } = getAuth(req)
  res.json({ data: toEvent(await loadOwnedEvent(db, userId, parseId(req.params.id))) })
})

eventsRouter.patch('/events/:id', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  const patch = eventUpdateSchema.parse(req.body)
  const current = await loadOwnedEvent(db, userId, id)

  const status = patch.status ?? current.status
  const occasion = patch.occasion === undefined ? current.occasion : patch.occasion
  if (status !== 'draft' && !occasion) throw invalid('An occasion is required unless the event is a draft.', 'occasion')
  if (patch.eventDate && patch.eventDate !== current.event_date)
    assertNotPast(patch.eventDate, await userToday(db, userId), 'eventDate')

  const row = unwrap(
    await db.from('events').update(toColumns(patch)).eq('id', id).eq('user_id', userId).select().single(),
  )
  res.json({ data: toEvent(row) })
})

eventsRouter.delete('/events/:id', async (req, res) => {
  const { db, userId } = getAuth(req)
  const deleted = unwrap(
    await db.from('events').delete().eq('id', parseId(req.params.id)).eq('user_id', userId).select('id'),
  )
  if (deleted.length === 0) throw notFound('Event')
  res.status(204).end()
})

/** Latest validated plan version, or null if none has been generated yet. */
eventsRouter.get('/events/:id/plan', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  await loadOwnedEvent(db, userId, id)
  const row = unwrapMaybe(
    await db
      .from('event_plans')
      .select('version, plan, created_at')
      .eq('event_id', id)
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  )
  res.json({ data: row ? { version: row.version, plan: row.plan, createdAt: row.created_at } : null })
})

/**
 * Plan editing: the user's event-day agenda is saved as a new plan version (history kept).
 * The context fingerprint is unchanged, so a later plain "generate" keeps this edit.
 */
eventsRouter.put('/events/:id/plan/schedule', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  const { schedule } = scheduleUpdateSchema.parse(req.body)
  await loadOwnedEvent(db, userId, id)
  const latest = unwrapMaybe(
    await db
      .from('event_plans')
      .select('version, plan')
      .eq('event_id', id)
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle(),
  )
  if (!latest) throw notFound('Plan')
  const plan = eventPlanSchema.parse({
    ...(latest.plan as object),
    schedule: [...schedule].sort((a, b) => a.time.localeCompare(b.time)),
  })
  const row = unwrap(
    await db
      .from('event_plans')
      .insert({ event_id: id, user_id: userId, version: latest.version + 1, plan })
      .select('version, plan, created_at')
      .single(),
  )
  res.json({ data: { version: row.version, plan: row.plan, createdAt: row.created_at } })
})

eventsRouter.patch('/events/:id/invitation', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  const { text, tone } = invitationSchema.parse(req.body)
  await loadOwnedEvent(db, userId, id)
  const row = unwrap(
    await db
      .from('events')
      .update({ invitation_text: text, invitation_tone: tone })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single(),
  )
  res.json({ data: toEvent(row) })
})
