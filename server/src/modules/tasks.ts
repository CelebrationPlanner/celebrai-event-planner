import { taskCreateSchema, tasksBulkSchema, taskUpdateSchema } from '@celebrai/shared'
import { Router } from 'express'
import { toTask } from '../db/mappers.ts'
import { invalid, notFound, unwrap, unwrapMaybe } from '../lib/errors.ts'
import { getAuth } from '../middleware/auth.ts'
import { assertNotPast, loadOwnedEvent, parseId, userToday } from './ownership.ts'

/** Deadlines must be realistic: not in the past, and not after the event itself. */
function assertDueDate(dueDate: string, today: string, eventDate: string | null, path = 'dueDate') {
  assertNotPast(dueDate, today, path)
  if (eventDate && dueDate > eventDate) throw invalid('The due date must be on or before the event date.', path)
}

export const tasksRouter = Router()

tasksRouter.get('/events/:id/tasks', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  await loadOwnedEvent(db, userId, id)
  const rows = unwrap(
    await db
      .from('tasks')
      .select('*')
      .eq('event_id', id)
      .eq('user_id', userId)
      .order('completed')
      .order('due_date', { nullsFirst: false })
      .order('created_at'),
  )
  res.json({ data: rows.map(toTask) })
})

tasksRouter.post('/events/:id/tasks', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  const input = taskCreateSchema.parse(req.body)
  const event = await loadOwnedEvent(db, userId, id)
  if (input.dueDate) assertDueDate(input.dueDate, await userToday(db, userId), event.event_date)
  const row = unwrap(
    await db
      .from('tasks')
      .insert({
        event_id: id,
        user_id: userId,
        title: input.title,
        priority: input.priority,
        due_date: input.dueDate,
        kind: input.kind,
      })
      .select()
      .single(),
  )
  res.status(201).json({ data: toTask(row) })
})

/** Adds several tasks in one insert: every deadline is checked first, so the batch is all-or-nothing. */
tasksRouter.post('/events/:id/tasks/bulk', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  const { tasks } = tasksBulkSchema.parse(req.body)
  const event = await loadOwnedEvent(db, userId, id)
  if (tasks.some((t) => t.dueDate)) {
    const today = await userToday(db, userId)
    tasks.forEach((t, i) => t.dueDate && assertDueDate(t.dueDate, today, event.event_date, `tasks.${i}.dueDate`))
  }
  const rows = unwrap(
    await db
      .from('tasks')
      .insert(
        tasks.map((t) => ({
          event_id: id,
          user_id: userId,
          title: t.title,
          priority: t.priority,
          due_date: t.dueDate,
          kind: t.kind,
        })),
      )
      .select(),
  )
  res.status(201).json({ data: rows.map(toTask) })
})

tasksRouter.patch('/events/:id/tasks/:taskId', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  const taskId = parseId(req.params.taskId, 'Task')
  const patch = taskUpdateSchema.parse(req.body)
  const event = await loadOwnedEvent(db, userId, id)
  const current = unwrapMaybe(
    await db.from('tasks').select('due_date').eq('id', taskId).eq('event_id', id).eq('user_id', userId).maybeSingle(),
  )
  if (!current) throw notFound('Task')
  // Only a changed due date is re-checked, so an existing overdue task can still be completed.
  if (patch.dueDate && patch.dueDate !== current.due_date)
    assertDueDate(patch.dueDate, await userToday(db, userId), event.event_date)

  const row = unwrap(
    await db
      .from('tasks')
      .update({
        title: patch.title,
        priority: patch.priority,
        due_date: patch.dueDate,
        kind: patch.kind,
        completed: patch.completed,
      })
      .eq('id', taskId)
      .eq('event_id', id)
      .eq('user_id', userId)
      .select()
      .single(),
  )
  res.json({ data: toTask(row) })
})

tasksRouter.delete('/events/:id/tasks/:taskId', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  const taskId = parseId(req.params.taskId, 'Task')
  const deleted = unwrap(
    await db.from('tasks').delete().eq('id', taskId).eq('event_id', id).eq('user_id', userId).select('id'),
  )
  if (deleted.length === 0) throw notFound('Task')
  res.status(204).end()
})
