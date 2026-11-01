import { missingDetails } from '@celebrai/shared'
import { Router } from 'express'
import { toEvent } from '../db/mappers.ts'
import { allocateBudget } from '../engine/budget.ts'
import { analyzeEvent } from '../engine/context.ts'
import { planTasks } from '../engine/tasks.ts'
import { getAuth } from '../middleware/auth.ts'
import { loadOwnedEvent, parseId, userToday } from './ownership.ts'

export const suggestionsRouter = Router()

/**
 * The deterministic engine's view of an event — budget split, checklist, rules applied and
 * missing details — computed instantly without AI and never saved. The client shows it for
 * review and applies only what the user accepts.
 */
suggestionsRouter.get('/events/:id/suggestions', async (req, res) => {
  const { db, userId } = getAuth(req)
  const event = toEvent(await loadOwnedEvent(db, userId, parseId(req.params.id)))
  const today = await userToday(db, userId)
  const analysis = analyzeEvent(event, today)
  res.json({
    data: {
      missing: missingDetails(event),
      decisions: analysis.decisions,
      budget: event.budgetMinor ? allocateBudget(event.budgetMinor, analysis.flags) : [],
      tasks: planTasks(event, analysis, today),
    },
  })
})
