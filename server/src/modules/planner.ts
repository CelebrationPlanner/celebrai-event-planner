import { chatRequestSchema, generatePlanSchema, invitationGenerateSchema, MAX_HISTORY, MAX_MESSAGE_LENGTH, type CelebrationEvent, type ChatMessage } from '@celebrai/shared'
import { Router, type RequestHandler } from 'express'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { buildChatPrompt, buildInvitationPrompt, buildPlanPrompt, contextOf, SYSTEM_RULES } from '../ai/prompts.ts'
import { AiError, type AIProvider } from '../ai/provider.ts'
import { aiChatSchema, aiInvitationSchema, aiPlanSchema } from '../ai/schemas.ts'
import { generateStructured } from '../ai/structured.ts'
import { toEvent } from '../db/mappers.ts'
import { allocateBudget } from '../engine/budget.ts'
import { analyzeEvent, missingDetails } from '../engine/context.ts'
import { applyExtraction, PLACEHOLDER_NAME } from '../engine/extraction.ts'
import { buildPlan } from '../engine/plan.ts'
import { planTasks } from '../engine/tasks.ts'
import { AppError, invalid, unwrap, unwrapMaybe } from '../lib/errors.ts'
import { getAuth, type Db } from '../middleware/auth.ts'
import { toColumns } from './events.ts'
import { loadOwnedEvent, parseId, userToday } from './ownership.ts'

const storedMessages = z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(MAX_MESSAGE_LENGTH * 2), at: z.string() }))

/** Translates provider failures into safe, user-facing API errors. Nothing is saved on failure. */
async function withAi<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (err) {
    if (!(err instanceof AiError)) throw err
    if (err.kind === 'timeout') throw new AppError(504, 'AI_TIMEOUT', 'The planner took too long to respond. Please try again.')
    if (err.kind === 'invalid_output') {
      console.warn(`AI output rejected: ${err.message}`)
      throw new AppError(502, 'AI_INVALID_OUTPUT', 'The planner returned an answer we couldn’t use. Nothing was saved — please try again.')
    }
    throw new AppError(503, 'AI_UNAVAILABLE', 'The AI planner is unavailable right now. Please try again shortly.')
  }
}

async function loadHistory(db: Db, userId: string, eventId: string): Promise<ChatMessage[]> {
  const row = unwrapMaybe(await db.from('conversations').select('messages').eq('event_id', eventId).eq('user_id', userId).maybeSingle())
  const parsed = storedMessages.safeParse(row?.messages ?? [])
  return parsed.success ? parsed.data.slice(-MAX_HISTORY) : []
}

/** Fingerprint of everything that shapes a plan; unchanged context means no new AI call. */
const contextHash = (e: CelebrationEvent) => createHash('sha256').update(JSON.stringify({ ...contextOf(e), currency: e.currency, budgetMinor: e.budgetMinor })).digest('hex')

export function createPlannerRouter(ai: AIProvider, aiLimiter: RequestHandler) {
  const router = Router()

  router.get('/events/:id/conversation', async (req, res) => {
    const { db, userId } = getAuth(req)
    const id = parseId(req.params.id)
    await loadOwnedEvent(db, userId, id)
    res.json({ data: await loadHistory(db, userId, id) })
  })

  /**
   * One assistant turn. The model extracts facts; the backend validates and saves them on the
   * event (D6), then asks for whatever is still missing — so it never re-asks for known details.
   * Without an eventId, the first message starts a draft event (D5).
   */
  router.post('/planner/chat', aiLimiter, async (req, res) => {
    const { db, userId } = getAuth(req)
    const { eventId, message } = chatRequestSchema.parse(req.body)
    const today = await userToday(db, userId)
    const current = eventId ? toEvent(await loadOwnedEvent(db, userId, eventId)) : null
    const history = eventId ? await loadHistory(db, userId, eventId) : []

    const turn = await withAi(
      generateStructured(ai, {
        system: SYSTEM_RULES,
        prompt: buildChatPrompt({ message, history, context: current ? contextOf(current) : {}, today, missing: current ? missingDetails(current).map((m) => m.field) : ['everything'] }),
        schema: aiChatSchema,
        maxOutputTokens: 2048,
      }),
    )
    const { patch, notes } = applyExtraction(current, turn.extracted, today)

    const row = current
      ? Object.keys(patch).length
        ? unwrap(await db.from('events').update(toColumns(patch)).eq('id', current.id).eq('user_id', userId).select().single())
        : await loadOwnedEvent(db, userId, current.id)
      : unwrap(
          await db
            .from('events')
            .insert({ ...toColumns(patch), user_id: userId, status: 'draft', event_name: patch.eventName ?? PLACEHOLDER_NAME, budget_minor: patch.budgetMinor ?? 0 })
            .select()
            .single(),
        )
    const event = toEvent(row)
    const missing = missingDetails(event)
    const questions = [...notes, ...missing.map((m) => m.question)]
    const reply = [turn.reply, ...(questions.length ? questions : ['I have everything I need — generate your plan whenever you’re ready.'])].join('\n\n')

    const at = new Date().toISOString()
    const messages = [...history, { role: 'user', content: message, at }, { role: 'assistant', content: reply, at }].slice(-MAX_HISTORY)
    unwrapMaybe(await db.from('conversations').upsert({ event_id: event.id, user_id: userId, messages }, { onConflict: 'event_id' }))

    res.json({ data: { event, reply, questions, missing: missing.map((m) => m.field), readyToGenerate: missing.length === 0 } })
  })

  /**
   * Generates (or reuses) a plan. Missing critical details return a clarification without
   * calling the model (Scenario 7). Engine decides numbers and dates; the model writes the words.
   */
  router.post('/planner/generate', aiLimiter, async (req, res) => {
    const { db, userId } = getAuth(req)
    const { eventId, regenerate } = generatePlanSchema.parse(req.body)
    const event = toEvent(await loadOwnedEvent(db, userId, eventId))

    const missing = missingDetails(event)
    if (missing.length) {
      res.json({ data: { kind: 'clarification', missing: missing.map((m) => m.field), questions: missing.map((m) => m.question) } })
      return
    }
    const today = await userToday(db, userId)
    if (event.eventDate! < today) throw invalid('The event date has passed. Update it before generating a plan.', 'eventDate')

    const hash = contextHash(event)
    if (!regenerate) {
      const latest = unwrapMaybe(await db.from('event_plans').select('version, plan').eq('event_id', eventId).eq('user_id', userId).order('version', { ascending: false }).limit(1).maybeSingle())
      if ((latest?.plan as { contextHash?: string } | undefined)?.contextHash === hash) {
        res.json({ data: { kind: 'plan', reused: true, version: latest!.version, plan: latest!.plan } })
        return
      }
    }

    const analysis = analyzeEvent(event, today)
    const budget = allocateBudget(event.budgetMinor, analysis.flags)
    const tasks = planTasks(event, analysis, today)
    const draft = await withAi(
      generateStructured(ai, { system: SYSTEM_RULES, prompt: buildPlanPrompt({ event, analysis, budget, tasks, today }), schema: aiPlanSchema, maxOutputTokens: 8192 }),
    )
    const plan = buildPlan({ ai: draft, event, analysis, budget, tasks, today, contextHash: hash })
    const version = unwrap(await db.rpc('save_generated_plan', { p_event_id: eventId, p_plan: plan, p_expenses: plan.budget, p_tasks: plan.checklist }))

    res.json({ data: { kind: 'plan', reused: false, version, plan } })
  })

  /** Drafts invitation text in the chosen tone. Not saved until the user edits/saves it. */
  router.post('/events/:id/invitation/generate', aiLimiter, async (req, res) => {
    const { db, userId } = getAuth(req)
    const { tone } = invitationGenerateSchema.parse(req.body)
    const event = toEvent(await loadOwnedEvent(db, userId, parseId(req.params.id)))
    const { text } = await withAi(generateStructured(ai, { system: SYSTEM_RULES, prompt: buildInvitationPrompt(event, tone), schema: aiInvitationSchema, maxOutputTokens: 1024 }))
    res.json({ data: { text, tone } })
  })

  return router
}
