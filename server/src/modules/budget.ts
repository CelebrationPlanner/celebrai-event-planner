import { budgetUpdateSchema, summarizeBudget } from '@celebrai/shared'
import { Router } from 'express'
import { toExpense } from '../db/mappers.ts'
import { unwrap, unwrapMaybe } from '../lib/errors.ts'
import { getAuth, type Db } from '../middleware/auth.ts'
import { loadOwnedEvent, parseId } from './ownership.ts'

/** Budget totals are always recalculated here from stored integers; clients never send totals. */
async function budgetView(db: Db, userId: string, eventId: string, budgetMinor: number) {
  const expenses = unwrap(await db.from('expenses').select('*').eq('event_id', eventId).eq('user_id', userId).order('created_at')).map(toExpense)
  return { expenses, summary: summarizeBudget(budgetMinor, expenses) }
}

export const budgetRouter = Router()

budgetRouter.get('/events/:id/budget', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  const event = await loadOwnedEvent(db, userId, id)
  res.json({ data: await budgetView(db, userId, id, event.budget_minor) })
})

/** Upserts category lines. Overruns are reported in the summary, never silently corrected. */
budgetRouter.patch('/events/:id/budget', async (req, res) => {
  const { db, userId } = getAuth(req)
  const id = parseId(req.params.id)
  const { expenses } = budgetUpdateSchema.parse(req.body)
  const event = await loadOwnedEvent(db, userId, id)
  unwrapMaybe(
    await db.from('expenses').upsert(
      expenses.map((x) => ({ event_id: id, user_id: userId, category: x.category, estimated_minor: x.estimatedMinor, actual_minor: x.actualMinor })),
      { onConflict: 'event_id,category' },
    ),
  )
  res.json({ data: await budgetView(db, userId, id, event.budget_minor) })
})
