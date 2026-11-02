import type { CurrencyCode } from '@celebrai/shared'
import { Router } from 'express'
import { toEvent } from '../db/mappers.ts'
import { unwrap } from '../lib/errors.ts'
import { getAuth } from '../middleware/auth.ts'
import { userToday } from './ownership.ts'

export const dashboardRouter = Router()

/**
 * Everything the dashboard shows in one round trip: events with task progress, totals and
 * recent activity derived from real rows (events created, tasks completed, plans generated).
 */
// ponytail: aggregates in JS over the user's tasks; move to a SQL view if one user ever has thousands.
dashboardRouter.get('/dashboard', async (req, res) => {
  const { db, userId } = getAuth(req)
  const [today, events, tasks, plans] = await Promise.all([
    userToday(db, userId),
    db
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: true, nullsFirst: false })
      .limit(50)
      .then(unwrap),
    db.from('tasks').select('event_id, title, completed, updated_at').eq('user_id', userId).then(unwrap),
    db
      .from('event_plans')
      .select('event_id, version, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(unwrap),
  ])

  const names = new Map(events.map((e) => [e.id, e.event_name]))
  const progress = new Map<string, { done: number; total: number }>()
  for (const t of tasks) {
    const p = progress.get(t.event_id) ?? { done: 0, total: 0 }
    p.total += 1
    if (t.completed) p.done += 1
    progress.set(t.event_id, p)
  }
  const budgetByCurrency: Partial<Record<CurrencyCode, number>> = {}
  for (const e of events)
    budgetByCurrency[e.currency as CurrencyCode] = (budgetByCurrency[e.currency as CurrencyCode] ?? 0) + e.budget_minor

  const activity = [
    ...events.map((e) => ({ eventId: e.id, message: `Created ${e.event_name}`, at: e.created_at })),
    ...tasks
      .filter((t) => t.completed)
      .map((t) => ({ eventId: t.event_id, message: `Completed “${t.title}”`, at: t.updated_at })),
    ...plans.map((p) => ({
      eventId: p.event_id,
      message: `Plan v${p.version} generated for ${names.get(p.event_id) ?? 'an event'}`,
      at: p.created_at,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8)

  const completedTasks = tasks.filter((t) => t.completed).length
  res.json({
    data: {
      events: events.map((e) => ({ ...toEvent(e), progress: progress.get(e.id) ?? { done: 0, total: 0 } })),
      totals: {
        upcomingEvents: events.filter((e) => !e.event_date || e.event_date >= today).length,
        budgetByCurrency,
        activeTasks: tasks.length - completedTasks,
        completedTasks,
      },
      activity,
    },
  })
})
